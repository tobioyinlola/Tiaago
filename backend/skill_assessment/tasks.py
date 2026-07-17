from datetime import timezone
import json
import uuid
from celery import shared_task
from django.urls import reverse
from django.conf import settings
from utils.email_handler import EmailHandler, EmailTypes
from .constants import SkillAssessmentDifficultyLevels, SkillAssessmentTypes
from create_user.models import TalentProfile
from roles.models import Role
from .models import (
    CandidateAssessmentMCQAnswer,
    GeneralSkillAssessment,
    GeneralSkillAssessmentSection,
    CandidateAssessmentSubmission,
    CandidateAssessmentSectionSubmission,
    GeneralSkillAssessmentMCQQuestion,
    CodingTask,
    MCQToCodingLink,
    TechStack,
    TestCase 
)
from django.db import IntegrityError, OperationalError, transaction
from skill_assessment.models import GeneralSkillAssessment
from utils.ai_service import AIService
from jobs.tasks import bill_service
from payments.models import ReportPAYGFlowStatus
from django.core.files.storage import default_storage
from django.core.exceptions import ValidationError
from loguru import logger
import math
from django.utils.timezone import now as tz_now

pass_mark = 70

FRONTEND_URL = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'localhost:3000/'

def _to_score(x, default=0.0) -> float:
    """Coerce any input to a sane score [0..100] or default."""
    try:
        s = float(x)
    except (TypeError, ValueError):
        return default
    if not math.isfinite(s) or math.isnan(s):  # NaN, inf, -inf
        return default
    # Optional: clamp to [0, 100]
    if s < 0.0: s = 0.0
    if s > 100.0: s = 100.0
    return s

def mark_mcq(
    skill_assessment_section: GeneralSkillAssessmentSection,
    skill_assessment_submission: CandidateAssessmentSubmission,
) -> float:
    """
    Returns MCQ score as a percentage [0..100], rounded to 2dp.
    Uses only the answers saved for the section at the time of the test,
    so questions added later do not affect the score.
    """
    # Find the section submission for this section
    section_submission = (
        skill_assessment_submission.skill_assessment_section_submissions
        .filter(skill_assessment_section=skill_assessment_section)
        .first()
    )
    if not section_submission:
        return 0.0

    # Pull only answers for this section submission; join question to compare correct index
    answers_qs = (
        CandidateAssessmentMCQAnswer.objects
        .select_related("question")
        .filter(section_submission=section_submission)
    )

    total = answers_qs.count()
    if total == 0:
        return 0.0

    correct = 0
    for ans in answers_qs:
        # selected_answer_index may be None; this comparison safely yields False in that case
        if ans.selected_answer_index == ans.question.correct_option_index:
            correct += 1

    score = (correct / total) * 100.0
    if score < 0.0:
        score = 0.0
    elif score > 100.0:
        score = 100.0
    return round(score, 2)

def _coerce_score(val, default=0.0):
        try:
            s = float(val)
        except Exception:
            return default
        return max(0.0, min(100.0, s))
def mark_coding_task(
    skill_assessment_section: GeneralSkillAssessmentSection,
    skill_assessment_submission: CandidateAssessmentSubmission,
):
    """
    Marks coding section with AI.
    Returns (section_percent_0_100, error or None).
    NOTE: AI returns coding score on 0..10. We normalize to percent here.
    """
    corresponding_answered_section = skill_assessment_submission.skill_assessment_section_submissions.filter(
        skill_assessment_section=skill_assessment_section
    ).first()
    if not corresponding_answered_section:
        return 0.0, "No answered section found."

    coding_tasks = skill_assessment_section.coding_tasks.all()
    if not coding_tasks.exists():
        return 0.0, "No coding tasks found."

    parent = skill_assessment_section.company_skill_assessment
    difficulty = (getattr(parent, "difficulty_level", "") or "").lower()
    if not difficulty:
        first_task = coding_tasks.first()
        if first_task and getattr(first_task, "difficulty_level", None):
            difficulty = (first_task.difficulty_level or "").lower()
    if difficulty not in {"junior", "intermediate", "senior"}:
        difficulty = "intermediate"

    assessment_result = {
        "assessment_type": "coding",
        "questions": [],
        "ai_determined_difficulty": difficulty,
        "role_type": None,
        "skills_assessed": list({skill for task in coding_tasks for skill in task.skills_assessed}),
        "stage": None,
        "assessment_id": coding_tasks.first().assessment_id or "",
    }

    user_answers = []
    for task in coding_tasks:
        assessment_result["questions"].append({
            "question": task.description,
            "function_signature": task.constraints,
            "test_cases": [
                {"input": tc.input_data, "expected_output": tc.expected_output}
                for tc in task.test_cases.all()
            ],
            "correct_answer": task.correct_answer,
        })
        answer_obj = corresponding_answered_section.coding_task_answers.filter(coding_task=task).first()
        user_code = answer_obj.user_answer if answer_obj else ""
        user_answers.append({"question": task.description, "user_answer": user_code})

    result = AIService.grade_coding_assessment(
        assessment_result=assessment_result,
        user_answers=user_answers
    )
    if not result:
        return 0.0, "Grading failed"

    raw = result.get("coding_score")
    try:
        raw_f = float(raw)
    except (TypeError, ValueError):
        return 0.0, "Invalid coding score"

    # Interpret AI score: if it looks like 0..10, scale to percent; if already 0..100, accept.
    if 0.0 <= raw_f <= 10.0:
        percent = (raw_f / 10.0) * 100.0
    else:
        percent = raw_f  # assume it’s already a percent
    return _coerce_score(percent), None


DEFAULT_PASSING_GRADE = getattr(settings, "SKILL_ASSESSMENT_PASSING_GRADE_DEFAULT", 70.0)
@shared_task(
    bind=True,
    name="mark_skill_assessment_submission",
    autoretry_for=(OperationalError,),
    retry_backoff=5,
    retry_jitter=True,
    max_retries=3,
)
def mark_skill_assessment_submission(self, skill_assessment_submission_id: int):
    submission = (
        CandidateAssessmentSubmission.objects
        .select_related(
            "candidate",
            "skill_assessment",
            "skill_assessment__job_application",
            "skill_assessment__job_application__job",
            "skill_assessment__company",
        )
        .prefetch_related(
            "skill_assessment__sections__mcq_questions_new",
            "skill_assessment__sections__coding_tasks",
        )
        .filter(id=skill_assessment_submission_id)
        .first()
    )
    if not submission:
        return {"status": "not_found", "id": skill_assessment_submission_id}

    if submission.mark_status == CandidateAssessmentSubmission.MarkStatusChoices.MARKED:
        return {
            "status": "already_marked",
            "id": submission.id,
            "score": submission.total_score,
            "passed": submission.is_passed,
        }

    assessment = submission.skill_assessment
    pass_mark = float(getattr(assessment, "passing_grade", None) or DEFAULT_PASSING_GRADE)

    sections_iter = assessment.sections.all()

    try:
        mcq_section_scores: list[float] = []
        code_section_scores: list[float] = []

        for section in sections_iter:
            try:
                if section.mcq_questions.exists():
                    mcq_pct = _to_score(mark_mcq(section, submission))
                    mcq_section_scores.append(mcq_pct)
            except Exception as e:
                submission.mark_status = CandidateAssessmentSubmission.MarkStatusChoices.FAILED_TO_MARK
                submission.save(update_fields=["mark_status"])
                logger.exception("MCQ marking failed for section %s, submission %s", section.id, submission.id)
                return {"status": "failed_to_mark", "id": submission.id, "error": f"MCQ: {e}"}

            # Coding part
            try:
                if section.coding_tasks.exists():
                    code_pct, error = mark_coding_task(section, submission)
                    if error:
                        submission.mark_status = CandidateAssessmentSubmission.MarkStatusChoices.FAILED_TO_MARK
                        submission.save(update_fields=["mark_status"])
                        return {"status": "failed_to_mark", "id": submission.id, "error": str(error)}
                    code_section_scores.append(_to_score(code_pct))
            except Exception as e:
                submission.mark_status = CandidateAssessmentSubmission.MarkStatusChoices.FAILED_TO_MARK
                submission.save(update_fields=["mark_status"])
                logger.exception("Coding marking failed for section %s, submission %s", section.id, submission.id)
                return {"status": "failed_to_mark", "id": submission.id, "error": f"Coding: {e}"}

        def _avg(vals: list[float]) -> float:
            return sum(vals) / len(vals) if vals else 0.0

        has_coding = bool(code_section_scores)
        mcq_avg    = _avg(mcq_section_scores)   
        code_avg   = _avg(code_section_scores) 

        if has_coding:
            total_score = round(0.5 * mcq_avg + 0.5 * code_avg, 2)
        else:
            total_score = round(mcq_avg, 2)

        total_score = _to_score(total_score)
        is_passed = total_score >= pass_mark

        with transaction.atomic():
            submission.total_score = total_score
            submission.is_passed = is_passed
            submission.mark_status = CandidateAssessmentSubmission.MarkStatusChoices.MARKED

            if not submission.is_completed:
                submission.is_completed = True
                submission.completed_at = tz_now()

            submission.save(update_fields=[
                "total_score", "is_passed", "mark_status", "is_completed", "completed_at"
            ])

            if assessment.company_id:
                from tags.tasks import evaluate_company_tags
                evaluate_company_tags.delay(assessment.company_id)

            if assessment.job_application_id:
                flow_status, _ = ReportPAYGFlowStatus.objects.select_for_update().get_or_create(
                    job_application=assessment.job_application
                )
                flow_status.status = ReportPAYGFlowStatus.Status.STARTED
                flow_status.error_message = ""
                flow_status.save(update_fields=["status", "error_message"])

        if is_passed:
            if assessment.job_application_id:
                try:
                    bill_service(assessment.job_application, "interview")
                except Exception as e:
                    try:
                        flow_status = ReportPAYGFlowStatus.objects.get(job_application=assessment.job_application)
                        flow_status.status = ReportPAYGFlowStatus.Status.FAILED
                        flow_status.error_message = f"Billing failed: {str(e)}"
                        flow_status.save(update_fields=["status", "error_message"])
                    except Exception:
                        logger.exception("Failed to update flow_status after billing error (submission %s)", submission.id)
                    logger.exception("Billing failed for job_application=%s", assessment.job_application_id)

            if getattr(assessment, "is_tiaago_skill_assessment", False):
                TalentProfile.objects.filter(
                    pk=submission.candidate_id, has_passed_tiaago_assessment=False
                ).update(has_passed_tiaago_assessment=True)

            if assessment.job_application_id and assessment.company_id:
                job = assessment.job_application.job
                has_published_slots = job.interview_availability_slots.filter(is_claimed=False).exists()
                try:
                    if has_published_slots:
                        send_interview_slot_selection_invite(submission, job)
                    else:
                        send_interview_invite(submission)
                except Exception:
                    logger.exception("Interview invite email failed for submission %s", submission.id)

        return {
            "status": "marked",
            "id": submission.id,
            "score": total_score,
            "passed": is_passed,
            "pass_mark": pass_mark,
        }

    except Exception as e:
        try:
            submission.mark_status = CandidateAssessmentSubmission.MarkStatusChoices.FAILED_TO_MARK
            submission.save(update_fields=["mark_status"])
        except Exception:
            logger.exception("Failed to set FAILED_TO_MARK for submission %s", submission.id)
        logger.exception("Unexpected mark failure for submission %s", submission.id)
        return {"status": "failed_to_mark", "id": submission.id, "error": str(e)}


def send_interview_invite(skill_assessment_submission):
    assessment_id = skill_assessment_submission.skill_assessment.id
    base = str(FRONTEND_URL).rstrip('/') + '/'
    interview_url = f"https://{base}talents/pre-screening/{assessment_id}"

    candidate_email = skill_assessment_submission.candidate.user.email
    candidate_name = skill_assessment_submission.candidate.user.get_full_name()
    first_name = skill_assessment_submission.candidate.user.first_name

    company = getattr(skill_assessment_submission.skill_assessment, "company", None)
    company_name = getattr(company, "company_name", "") if company else ""

    context = {
        "first_name": first_name,
        "company": company_name,
        "interview_url": interview_url,
    }

    email_handler = EmailHandler(recipients=[candidate_email])
    email_handler.send_mail(
        subject="You have an interview",
        context=context,
        template="emails/interview_invite.html",
        email_type=EmailTypes.TALENT_ASSESSMENT_PASS_MAIL,
    )


def send_interview_slot_selection_invite(skill_assessment_submission, job):
    """Invite a candidate who passed their assessment to pick a human-interview
    time slot the recruiter published for this job.

    Sent instead of send_interview_invite (Tiaago's AI pre-screening invite) when
    the job has unclaimed JobInterviewAvailabilitySlots -- see mark_skill_assessment_submission.
    """
    base = str(FRONTEND_URL).rstrip('/') + '/'
    slots_url = f"https://{base}talents/jobs/{job.public_id}/interview-slots"

    candidate_email = skill_assessment_submission.candidate.user.email
    first_name = skill_assessment_submission.candidate.user.first_name

    company = getattr(skill_assessment_submission.skill_assessment, "company", None)
    company_name = getattr(company, "company_name", "") if company else ""

    context = {
        "first_name": first_name,
        "company": company_name,
        "role": job.title,
        "slots_url": slots_url,
    }

    email_handler = EmailHandler(recipients=[candidate_email])
    email_handler.send_mail(
        subject="Pick your interview time",
        context=context,
        template="emails/interview_slot_selection.html",
        email_type=EmailTypes.INTERVIEW_SLOT_SELECTION_MAIL,
    )


"""@shared_task(name="create_talent_coding_assessment_task", bind=True, max_retries=2)
def create_talent_coding_assessment_task(
    self, stack_id, role_id, difficulty_level, name, description, duration_minutes
):

    try:
        stack = TechStack.objects.get(id=stack_id)
    except TechStack.DoesNotExist:
        raise ValueError(f"Stack with id={stack_id} does not exist")

    try:
        role = Role.objects.get(id=role_id)
    except Role.DoesNotExist:
        raise ValueError(f"Role with id={role_id} does not exist")

    ai_response = AIService.get_talent_coding_questions(
        programming_languages=stack.stack, difficulty=difficulty_level
    )

    if not ai_response or "questions" not in ai_response:
        raise ValueError("Failed to retrieve coding questions from AI service.")

    question_objs = []
    coding_questions = ai_response["questions"]
    for coding_question in coding_questions:
        test_cases = coding_question.get("test_cases", [])

        coding_task_obj = CodingTask.objects.create(
            is_ai_generated=True,
            title=f"Coding Task for talents with {stack}",
            description=coding_question.get("question"),
            constraints=coding_question.get("function_signature"),
            difficulty_level=difficulty_level,
            skills_assessed=ai_response.get("skills_assessed"),
        )
        question_objs.append(coding_task_obj)
        TestCase.objects.bulk_create(
            [
                TestCase(
                    coding_task=coding_task_obj,
                    input_data=test_case.get("input"),
                    expected_output=test_case.get("expected_output"),
                )
                for test_case in test_cases
            ]
        )

    # Create the assessment
    skill_assessment = GeneralSkillAssessment.objects.create(
        title=name,
        published=True,
        difficulty_level=difficulty_level,
        description=description,
        duration_minutes=duration_minutes,
        passing_grade=70,
        reference=str(uuid.uuid4().hex)[:15],
        assessment_type=SkillAssessmentTypes.CODING_TASK,
    )
    skill_assessment.skillsets.add(role)

    coding_section = GeneralSkillAssessmentSection.objects.create(
        name="Coding",
        company_skill_assessment=skill_assessment,
        type=SkillAssessmentTypes.CODING_TASK,
    )
    coding_section.coding_tasks.set(question_objs)

   
    return "Completed"""

def _canonical_difficulty(lower_val: str) -> str:
    """Map lowercase to your canonical enum for storage (DB choices)."""
    v = (lower_val or "").strip().lower()
    mapping = {
        SkillAssessmentDifficultyLevels.JUNIOR.lower(): SkillAssessmentDifficultyLevels.JUNIOR,
        SkillAssessmentDifficultyLevels.INTERMEDIATE.lower(): SkillAssessmentDifficultyLevels.INTERMEDIATE,
        SkillAssessmentDifficultyLevels.SENIOR.lower(): SkillAssessmentDifficultyLevels.SENIOR,
    }
    return mapping.get(v, SkillAssessmentDifficultyLevels.INTERMEDIATE)

    

@shared_task(name="create_talent_coding_assessment_task_v2", bind=True, max_retries=2)
def create_talent_coding_assessment_task_v2(
    self,
    stack_id,
    role_id,
    difficulty_level,          # expected lowercase from caller
    name,
    description,
    duration_minutes,
    assessment_link,           # parent.assessment_id or parent.reference (stable)
    coding_section_id,         # CODING_TASK section id
    mcq_coding_link_id=None,   
    mcq_section_id=None,       
):
    # --- Lookups & invariants -------------------------------------------

    try:
        stack = TechStack.objects.get(id=stack_id)
    except TechStack.DoesNotExist:
        raise ValueError(f"Stack with id={stack_id} does not exist")

    if not Role.objects.filter(id=role_id).exists():
        raise ValueError(f"Role with id={role_id} does not exist")

    try:
        section = (
            GeneralSkillAssessmentSection.objects
            .select_related("company_skill_assessment")
            .get(id=coding_section_id)
        )
    except GeneralSkillAssessmentSection.DoesNotExist:
        raise ValueError(f"Coding section with id={coding_section_id} does not exist")

    if section.type != SkillAssessmentTypes.CODING_TASK:
        raise ValueError("Provided coding_section_id is not a CODING_TASK section.")

    parent = section.company_skill_assessment

    # Optional MCQ section coherence check
    if mcq_section_id:
        mcq_section = (
            GeneralSkillAssessmentSection.objects
            .select_related("company_skill_assessment")
            .filter(id=mcq_section_id)
            .first()
        )
        if not mcq_section or mcq_section.company_skill_assessment_id != parent.id:
            raise ValueError("mcq_section_id does not belong to same assessment as coding_section_id.")

    parent_link = parent.assessment_id or parent.reference
    if parent_link != assessment_link:
        raise ValueError("assessment_link does not match section's parent assessment.")

    # Stack coherence
    if parent.assessment_stack_id and parent.assessment_stack_id != stack_id:
        raise ValueError("stack_id does not match section's parent assessment_stack.")

    # Difficulty: AI wants lowercase; DB stores canonical
    diff_lower = (difficulty_level or "").strip().lower()
    diff_canonical = _canonical_difficulty(diff_lower)

    # --- AI call with retries -------------------------------------------

    try:
        ai_response = AIService.get_talent_coding_questions(
            programming_languages=getattr(stack, "stack", None),
            difficulty=diff_lower,
        )
    except Exception as e:
        if self.request.retries < self.max_retries:
            countdown = 30 * (self.request.retries + 1)
            logger.warning("AI call failed (transport). Retry %s in %ss: %s",
                           self.request.retries + 1, countdown, e)
            raise self.retry(exc=e, countdown=countdown)
        logger.exception("AI call failed after max retries.")
        raise

    if isinstance(ai_response, str):
        logger.warning("AI returned non-JSON string (preview): %s", ai_response[:200])
        try:
            ai_response = json.loads(ai_response)
        except Exception:
            if self.request.retries < self.max_retries:
                countdown = 30 * (self.request.retries + 1)
                logger.warning("AI returned non-JSON (likely 503). Retry %s in %ss.",
                               self.request.retries + 1, countdown)
                raise self.retry(exc=ValueError("AI returned non-JSON"), countdown=countdown)
            raise ValueError("Failed to retrieve coding questions from AI service (non-JSON).")

    if not isinstance(ai_response, dict) or "questions" not in ai_response:
        keys = list(ai_response.keys()) if isinstance(ai_response, dict) else type(ai_response)
        logger.warning("AI response missing 'questions'. Keys: %s", keys)
        if self.request.retries < self.max_retries:
            countdown = 30 * (self.request.retries + 1)
            raise self.retry(exc=ValueError("AI response missing 'questions'"), countdown=countdown)
        raise ValueError("Failed to retrieve coding questions from AI service.")

    questions = ai_response.get("questions") or []
    top_skills_assessed = ai_response.get("skills_assessed") or []

    # --- Persist tasks + complete links (atomic) -------------------------

    created_tasks = []

    with transaction.atomic():
        # Attach all created tasks to this section
        for i, cq in enumerate(questions, start=1):
            title = (cq.get("title") or f"{name} – Coding Task {i}").strip()
            skills_assessed = cq.get("skills_assessed") or top_skills_assessed
            correct_answer = cq.get("correct_answer")
            
            

            # Idempotency by (assessment_id, title)
            try:
                task, created = CodingTask.objects.update_or_create(
                    assessment_id=assessment_link,
                    title=title,
                    defaults={
                        "is_ai_generated": True,
                        "description": cq.get("question"),
                        "input_format": cq.get("input_format"),
                        "output_format": cq.get("output_format"),
                        "constraints": cq.get("function_signature"),
                        "sample_input": cq.get("sample_input"),
                        "sample_output": cq.get("sample_output"),
                        "difficulty_level": diff_canonical,  # store canonical
                        "skills_assessed": skills_assessed,
                        "max_score": int(cq.get("max_score", 100) or 100),
                        "time_limit": int(cq.get("time_limit", 60) or 60),
                        "correct_answer": correct_answer,
                        "stack": stack,
                    },
                )
            except IntegrityError:
                task = CodingTask.objects.filter(
                    assessment_id=assessment_link, title=title
                ).first()
                created = False

            if created:

                tcs = cq.get("test_cases") or []
                if tcs:
                    TestCase.objects.bulk_create([
                        TestCase(
                            coding_task=task,
                            input_data=tc.get("input"),
                            expected_output=tc.get("expected_output"),
                        )
                        for tc in tcs
                    ])
                created_tasks.append(task)

        if created_tasks:
            section.coding_tasks.add(*created_tasks)

        # Upgrade assessment type (MCQ-only -> CUSTOM since MIXED is not in your choices)
        if created_tasks and parent.assessment_type == SkillAssessmentTypes.MCQ:
            parent.assessment_type = SkillAssessmentTypes.CUSTOM
            parent.save(update_fields=["assessment_type"])

        # Complete / create MCQ↔Coding links
        if created_tasks and mcq_coding_link_id:
            # Link the FIRST created task to the provided link (race-safe)
            try:
                link = MCQToCodingLink.objects.select_for_update().get(id=mcq_coding_link_id)
            except MCQToCodingLink.DoesNotExist:
                link = None

            if link:
                # sanity: ensure link belongs to same assessment
                if link.assessment_id != parent.id:
                    raise ValidationError("Assessment mismatch between link and coding section.")
                # Attach the first task if link is still open
                if link.coding_task_id is None:
                    link.coding_task = created_tasks[0]
                    link.full_clean()
                    link.save(update_fields=["coding_task", "updated"])
                else:
                    logger.info("MCQToCodingLink %s already completed with task %s",
                                link.id, link.coding_task_id)

            # If AI returned >1 tasks, create sibling links so nothing is orphaned
            if len(created_tasks) > 1 and link:
                # Create additional links for tasks[1:], tied to same MCQ/section/assessment
                extra_links = []
                for task in created_tasks[1:]:
                    extra_links.append(MCQToCodingLink(
                        assessment=link.assessment,
                        section=link.section,
                        mcq=link.mcq,
                        coding_task=task,
                    ))
                MCQToCodingLink.objects.bulk_create(extra_links, ignore_conflicts=True)

    return f"Created {len(created_tasks)} coding task(s) for assessment {parent.id} (new: {len(created_tasks)})"
