import logging
import uuid
from django.db import transaction
from django.contrib.auth import get_user_model
from celery import shared_task
from emails import emails
from jobs.models import (
    CandidateResumeScreening,
    Job,
    JobApplication,
    JobAssessmentTemplate,
    SkillAssessmentScreening,
    TalentScreening
)
from payments.billing_utils import (
    get_latest_tiaago_pricing,
    recruiter_has_exceeded_free_candidate_screening,
)
from roles.models import Role
from skill_assessment.constants import (
    SkillAssessmentDifficultyLevels,
    SkillAssessmentTypes,
)
from skill_assessment.models import (
    CodingTask,
    GeneralSkillAssessment,
    GeneralSkillAssessmentSection,
    PendingResumeAnalysis,
    ResumeAnalysis,
    GeneralSkillAssessmentMCQQuestion,
    TestCase,
    TalentQuestionBank
)
from create_user.models import TalentProfile
from utils.ai_service import AIService
import time
import requests

from django.conf import settings
from django.utils.timezone import now
from payments.models import UsageEvent,ReportPAYGFlowStatus
from django.db.models import Count
from subscriptions.models import UserUsage, WalletUserUsage
from subscriptions.helper import get_payg_price, check_subscription_wallet_fallback
from analytics.models import AIUsageLog
import json

logger = logging.getLogger(__name__)

# logger = logging.getLogger("tasks")


def _log_ai_usage(service_type, job_application, company, succeeded, error_message=None):
    """Best-effort AI-call instrumentation for admin analytics (Board 2/7).
    Never raises -- a logging failure must not break the underlying AI-driven
    resume screening / assessment generation flow it's observing."""
    try:
        AIUsageLog.objects.create(
            service_type=service_type,
            job_application=job_application,
            company=company,
            succeeded=succeeded,
            error_message=error_message,
        )
    except Exception:
        logger.exception("Failed to write AIUsageLog for %s", service_type)

REJECTION_MAIL_DELAY_SECONDS = settings.REJECTION_MAIL_DELAY_SECONDS
ACCEPTANCE_MAIL_DELAY_SECONDS = settings.ACCEPTANCE_MAIL_DELAY_SECONDS


User = get_user_model()

STRIPE_API_KEY = settings.STRIPE_SECRET_KEY

PAYSTACK_KEY = settings.PAYSTACK_PRIVATE_KEY
FREE_TRIAL_LIMIT = 10  #free trial
def _send_stripe_meter_event(customer_id: str, value: int) -> bool:
    identifier = str(uuid.uuid4())
    payload = {
        "event_name": settings.METER_NAME,
        "payload[stripe_customer_id]": customer_id,
        "payload[value]": str(value),
        "identifier": identifier,
    }
    r = requests.post(
        "https://api.stripe.com/v1/billing/meter_events",
        headers={"Authorization": f"Bearer {STRIPE_API_KEY}"},
        data=payload,
        timeout=30,
    )
    r.raise_for_status()
    return identifier     

def bill_usage(job_application, *, service_type: str, value: int = 1):
    """
    PAYG billing with a one-time 10-event free tier per company.
    - Records EVERY usage event.
    - Charges only after the company exceeds FREE_TRIAL_LIMIT total events.
    """
    try:
        company     = job_application.job.company
        company_rep = getattr(company, "company_rep", None)
        if not company_rep:
            logger.error("No company rep found.")
            return

        stripe_id     = company_rep.stripe_customer_id
        paystack_id   = company_rep.paystack_customer_id
        provider      = None      # 'stripe', 'paystack', or 'free'
        external_id   = None
        will_bill_now = False

        with transaction.atomic():  
            lifetime_applications = JobApplication.objects.filter(
                job__company=company
            ).count()

            if lifetime_applications >= FREE_TRIAL_LIMIT:
                will_bill_now = True
            else:
                will_bill_now = value > (FREE_TRIAL_LIMIT - lifetime_applications)

            # Decide billing provider
            if will_bill_now:
                if stripe_id :
                    provider = "stripe"
                    try:
                        external_id = _send_stripe_meter_event(stripe_id, value)
                    except Exception as e:
                        logger.error(f"Stripe billing failed: {str(e)}")
                        provider = "free"
                        will_bill_now = False
                elif paystack_id :
                    provider = "paystack"
                else:
                    logger.warning("Customer has no payment profile; cannot bill.")
                    provider = "free"
                    will_bill_now = False
            else:
                provider = "free"

            # Save usage
            UsageEvent.objects.create(
                job_application = job_application,
                service_type    = service_type,
                provider        = provider,
                external_id     = external_id,
                quantity        = value,
                billed          = will_bill_now and provider == "paystack",
                billed_at       = now() if (will_bill_now and provider == "paystack") else None,
                used_at         = now(),
            )

        logger.info(
            f"{'BILLED' if will_bill_now else 'FREE'} | "
            f"company={company.company_name} | "
            f"used={lifetime_applications + 1}"
        )

    except Exception as e:
        logger.error(f"Billing API error: {str(e)}")

def bill_service(job_application, service_type: str):
    value = settings.SERVICE_PRICING.get(service_type)
    if value is None:
        raise ValueError(f"Unknown service type: {service_type}")
    bill_usage(job_application, service_type=service_type, value=value)


def create_talent_screening(
    job_application: JobApplication, resume_analysis: ResumeAnalysis
):
    """
    Helper function to create a talent screening model\n
    Called after AI has done a resume analysis on a job
    applicant's resume
    """
    existing_talent_screening = TalentScreening.objects.filter(
        job_application=job_application
    ).first()
    if not existing_talent_screening:
        is_paid_screening = recruiter_has_exceeded_free_candidate_screening(
            job_application.job.company
        )
        resume_screening_fee = 0
        talent_screening = TalentScreening.objects.create(
            job_application=job_application,
            is_paid_screening=is_paid_screening,
        )
        if is_paid_screening:
            latest_tiaago_pricing = get_latest_tiaago_pricing()
            if latest_tiaago_pricing:
                resume_screening_fee = latest_tiaago_pricing.resume_screening_fee
        if resume_analysis:
            CandidateResumeScreening.objects.create(
                talent_screening=talent_screening,
                fee=resume_screening_fee,
                fee_note=f"Resume screening for {job_application.applicant.user.get_full_name()} for job {job_application.job.title}",
                resume_analysis=resume_analysis,
            )
            # The recruiter should be charged here since it's PAYG
        return talent_screening


def add_skill_assessment_to_talent_screening(
    skill_assessment: GeneralSkillAssessment, mcq, coding_task
):
    """Helper function to add skill assessment screening to a talent screening instance"""
    job_application = skill_assessment.job_application
    if job_application:
        talent_screening = TalentScreening.objects.filter(
            job_application=job_application
        ).first()
        mcq_assessment_fee = 0
        coding_task_assessment_fee = 0
        if not talent_screening:
            return
        if talent_screening.is_paid_screening:
            latest_pricing = get_latest_tiaago_pricing()
            if mcq:
                mcq_assessment_fee = (
                    latest_pricing.mcq_skill_assessment_per_candidate_fee
                )
            if coding_task:
                coding_task_assessment_fee = (
                    latest_pricing.code_skill_assessment_per_candidate_fee
                )
        fee_note = f"Skill Assessment fee for {job_application.applicant.user.get_full_name()} for job {job_application.job.title}"
        if mcq:
            fee_note += " (MCQ)"
        if coding_task:
            fee_note += " (Coding Task)"
        SkillAssessmentScreening.objects.create(
            talent_screening=talent_screening,
            fee=mcq_assessment_fee + coding_task_assessment_fee,
            fee_note=fee_note,
            skill_assessment=skill_assessment,
        )
        # charge recruiter here cause its PAYG


@shared_task
def send_job_status_notification(job_id, new_status):
    """Notify all company team members when a job is deactivated or reactivated by admin."""
    from create_user.models import CompanyTeamMember

    job = Job.objects.select_related("company").filter(id=job_id).first()
    if not job or not job.company:
        logger.error("send_job_status_notification: job %s not found", job_id)
        return

    members = CompanyTeamMember.objects.select_related("user").filter(company=job.company)
    recipient_users = [m.user for m in members if m.user and m.user.email]

    company_rep = getattr(job.company, "company_rep", None)
    if company_rep and company_rep.email:
        rep_emails = {company_rep.email}
        member_emails = {u.email for u in recipient_users}
        if company_rep.email not in member_emails:
            recipient_users.append(company_rep)

    if new_status == "ACTIVE":
        for user in recipient_users:
            try:
                emails.job_reactivated_mail(user, job)
            except Exception:
                logger.exception("Failed to send reactivation email to %s", user.email)
    else:
        for user in recipient_users:
            try:
                emails.job_deactivated_mail(user, job)
            except Exception:
                logger.exception("Failed to send deactivation email to %s", user.email)

    logger.info("Job status notification sent for job %s (%s) to %d recipients", job_id, new_status, len(recipient_users))


@shared_task
def send_rejection_mail(job_id, talent_profile_id, areas_for_improvement=None):
    """
    Send a rejection mail to an applicant.\n
    This is sent after AI analyzes the applicant's resume and marks them as unfit for the role
    """
    logger.info(f"send_rejection_mail called with job_id={job_id}, talent_profile_id={talent_profile_id}")
    job = Job.objects.filter(id=job_id).first()
    talent_profile = TalentProfile.objects.filter(id=talent_profile_id).first()
    if job and talent_profile and talent_profile.user:
        emails.applicant_vetting_mail(
            talent_profile.user,
            job,
            "unconsider",
            areas_for_improvement=areas_for_improvement,
        )


@shared_task
def send_assessment_link(job_application_id, trials=0):
    """
    Send an assessment link to an applicant.\n
    This is sent after AI analyzes the applicant's resume and recommends them for the role\n
    The assessment is the next step in the screening

    Application `->` Resume analysis `->` Assessment `->` Interview
    """
    logger.info("send_assessment_link called ")

    job_application = (
        JobApplication.objects.select_related("job", "applicant", "applicant__user")
        .filter(id=job_application_id)
        .first()
    )
    if not job_application:
        logger.error("Job application %s not found", job_application_id)
        return "Job application not found"
    
    company = job_application.job.company
    usage = UserUsage.objects.filter(company=company).first()
    check_subscription_wallet_fallback(company, usage, determiner="assessment")

    flow_status, _ = ReportPAYGFlowStatus.objects.get_or_create(job_application=job_application)
    flow_status.status = ReportPAYGFlowStatus.Status.STARTED
    flow_status.error_message = ""
    flow_status.save()
    def try_again(error_message):
        new_num_of_trials = trials + 1
        if new_num_of_trials > 3:
            flow_status.status = ReportPAYGFlowStatus.Status.FAILED
            flow_status.error_message = f"Assessment retry limit reached: {error_message}"
            flow_status.save()
            return error_message
        send_assessment_link.apply_async(
            args=[job_application_id, new_num_of_trials],
            countdown=ACCEPTANCE_MAIL_DELAY_SECONDS,
        )
        flow_status.status = ReportPAYGFlowStatus.Status.FAILED
        flow_status.error_message = f"Assessment error: {error_message}"
        flow_status.save()
    job = job_application.job
    is_technical = job.role.is_technical
    talent_profile = job_application.applicant
    if job and talent_profile and talent_profile.user:
        job_difficulty = "beginner"
        coding_task_difficulty_level = "Easy"
        assessment_difficulty_level = SkillAssessmentDifficultyLevels.JUNIOR
        if job.job_level == Job.JobLevel.JUNIOR:
            job_difficulty = "intermediate"
            coding_task_difficulty_level = "Medium"
            assessment_difficulty_level = SkillAssessmentDifficultyLevels.INTERMEDIATE
        elif job.job_level == Job.JobLevel.SENIOR:
            job_difficulty = "advanced"
            coding_task_difficulty_level = "Hard"
            assessment_difficulty_level = SkillAssessmentDifficultyLevels.SENIOR
        mcq_sections = []  # list of {"name": str, "questions": [formatted question dicts]}
        coding_questions = []
        assessment_id = None  # Initialize for all job types

        assessment_template = getattr(job, "assessment_template", None)
        use_template = bool(
            assessment_template and assessment_template.status == JobAssessmentTemplate.Status.READY
        )

        try:
            if use_template:
                # Recruiter-approved question set from the job-creation wizard -- every
                # candidate for this job gets the same, reviewed questions instead of a
                # fresh AI call. One section per category, matching the template.
                for section in assessment_template.sections.all().prefetch_related("questions"):
                    mcq_sections.append(
                        {
                            "name": section.name,
                            "questions": [
                                {
                                    "question": q.question,
                                    "options": q.options,
                                    "correct_option_index": q.correct_option_index,
                                    "is_ai_generated": q.is_ai_generated,
                                }
                                for q in section.questions.all()
                            ],
                        }
                    )
                if not mcq_sections:
                    return try_again("Job assessment template has no sections")

                if is_technical:
                    # Coding questions aren't part of the wizard's scope -- still generate
                    # those fresh per candidate, same as the legacy (non-template) path.
                    multistage_assessment = AIService.get_multistage_technical_assessment(
                        job_description=job.description, mcq_questions=1, coding_questions=1
                    )
                    _log_ai_usage("coding_assessment", job_application, company, succeeded=bool(multistage_assessment))
                    if not multistage_assessment:
                        return try_again("Failed to get coding questions from AI service")
                    coding_questions = multistage_assessment.get("coding_questions") or []
                    if not coding_questions:
                        return try_again("Failed to get coding questions from AI service")
            elif not is_technical:
                mcq_questions = AIService.get_mcq_questions(
                    job_description=job.description,
                    # assessment_type="mcq",
                    num_questions=30
                )
                _log_ai_usage("mcq_generation", job_application, company, succeeded=bool(mcq_questions))
                if not mcq_questions:
                    return try_again("Failed to get mcq questions from AI service")
                mcq_sections = [{"name": "Multiple Choice Questions", "questions": mcq_questions}]
                coding_questions = []
            else:
                multistage_assessment = AIService.get_multistage_technical_assessment(
                    job_description=job.description, mcq_questions=20, coding_questions=1
                )
                _log_ai_usage("coding_assessment", job_application, company, succeeded=bool(multistage_assessment))
                if not multistage_assessment:
                    return try_again("Failed to get multistage assessment from AI service")

                assessment_id = multistage_assessment.get("assessment_id")
                mcq_questions = multistage_assessment.get("mcq_questions") or []
                coding_questions = multistage_assessment.get("coding_questions") or []

                if not mcq_questions:
                    return try_again("Failed to get mcq questions from AI service")
                if not coding_questions:
                    return try_again("Failed to get coding questions from AI service")
                mcq_sections = [{"name": "Multiple Choice Questions", "questions": mcq_questions}]
        except Exception as e:
            logger.exception("AI service error: %s", e)
            _log_ai_usage(
                "coding_assessment" if is_technical else "mcq_generation",
                job_application, company, succeeded=False, error_message=str(e),
            )
            return try_again(f"AI service error: {e}")
        duration_minutes = job.assessment_time_limit or (30 if coding_questions else 10)  # 10 for non tech and 30 for tech
        try:
            with transaction.atomic():
                company_skill_assessment = GeneralSkillAssessment.objects.create(
                    company=job.company,
                    title=f"Assessment for {job.role} role at {job.company.company_name} for  {talent_profile.user.get_full_name()}",
                    published=True,
                    difficulty_level=assessment_difficulty_level,
                    description=f"Assessment for {job.role} role at {job.company.company_name} for  {talent_profile.user.get_full_name()}",
                    duration_minutes=duration_minutes,
                    passing_grade=job.get_passing_grade(),
                    reference=str(uuid.uuid4().hex)[:15],
                    assessment_id=assessment_id if is_technical else None,
                    assessment_type=SkillAssessmentTypes.CUSTOM,
                    job_application=job_application,
                )
                # attach skillset/role
                company_skill_assessment.skillsets.set([job.role])

                # Create one MCQ section per category (a single "Multiple Choice
                # Questions" section in the legacy/fallback path, or one section per
                # JobAssessmentTemplateSection when sourced from the wizard's template).
                for mcq_section_data in mcq_sections:
                    section_questions = mcq_section_data.get("questions") or []
                    if not section_questions:
                        continue
                    mcq_section = GeneralSkillAssessmentSection.objects.create(
                        name=mcq_section_data["name"],
                        company_skill_assessment=company_skill_assessment,
                        type=SkillAssessmentTypes.MCQ,
                    )
                    for mcq in section_questions:
                        is_ai_generated = mcq.get("is_ai_generated", False)
                        question = mcq.get("question")
                        options = mcq.get("options", [])
                        correct_option_index = mcq.get("correct_option_index")
                        mcq_question_obj = GeneralSkillAssessmentMCQQuestion.objects.create(
                            question=question,
                            options=options,
                            correct_option_index=correct_option_index,
                            is_ai_generated=is_ai_generated,
                        )
                        mcq_section.mcq_questions_new.add(mcq_question_obj)

                # Create coding section only if coding_questions exist (for technical jobs)
                if coding_questions:
                    coding_section = GeneralSkillAssessmentSection.objects.create(
                        name="Coding Task",
                        company_skill_assessment=company_skill_assessment,
                        type=SkillAssessmentTypes.CODING_TASK,
                    )
                    for coding_question in coding_questions:
                        test_cases = coding_question.get("test_cases", []) or []
                        coding_task_obj = CodingTask.objects.create(
                            is_ai_generated=coding_question.get("is_ai_generated", False),
                            title=f"Coding Task for {job.role} role - Applicant {talent_profile.user.get_full_name()}",
                            description=coding_question.get("question"),
                            constraints=coding_question.get("function_signature"),
                            difficulty_level=coding_question.get("difficulty_level", coding_task_difficulty_level),
                            skills_assessed=coding_question.get("skills_assessed", []),
                            max_score=coding_question.get("max_score", 100),
                        )
                        coding_section.coding_tasks.add(coding_task_obj)

                        # bulk-create test cases if any
                        test_case_objs = []
                        for tc in test_cases:
                            test_case_objs.append(
                                TestCase(
                                    coding_task=coding_task_obj,
                                    input_data=tc.get("input"),
                                    expected_output=tc.get("expected_output"),
                                )
                            )
                        if test_case_objs:
                            TestCase.objects.bulk_create(test_case_objs)
            # No-login candidate flow: the invite token is unguessable and scoped to this
            # one assessment/candidate, so the link needs no login/account on the other end.
            assessment_link = f"{settings.FRONTEND_BASE_URL}/assessment-invite/{company_skill_assessment.invite_token}/"
            logger.info(f"Assessment link: {assessment_link}")
        except Exception as e:
            logger.exception("Failed to create skill assessment: %s", e)
            return try_again(f"Failed to create skill assessment: {e}")

        #bill them here for assessment
        try:
            if is_technical:
                bill_service(job_application, "technical_assessment")
            else:
                bill_service(job_application, "non_technical_assessment")
        except Exception as e:
            flow_status.status = ReportPAYGFlowStatus.Status.FAILED
            flow_status.error_message = f"Billing failed: {str(e)}"
            flow_status.save()
            logger.info(f"Billing failed")
        logger.info(f"Attempting to send applicant vetting mail to {talent_profile.user.email}")
        emails.applicant_vetting_mail(
            talent_profile.user, job, "consider", assessment_link=assessment_link
        )
        logger.info("Applicant vetting mail function executed")
        add_skill_assessment_to_talent_screening(
            skill_assessment=company_skill_assessment, mcq=bool(mcq_sections), coding_task=bool(coding_questions)
        )
        flow_status.status = ReportPAYGFlowStatus.Status.COMPLETED
        flow_status.error_message = ""
        flow_status.save()


def on_analyze_resume(
    job_application: JobApplication,
    resume_path: str,
    resume_name: str,
    job_description: str,
):
    """Helper function to analyze resume"""
    logger.info("Analyzing resume....")
    response = AIService.analyze_resume(
        resume_name=resume_name,
        resume_path=resume_path,
        job_description=job_description,
    )
    _log_ai_usage(
        "resume_analysis", job_application, getattr(job_application.job, "company", None),
        succeeded=bool(response),
    )
    if response:
        recommendation = response.get("recommendation")
        areas_for_improvement = response.get("areas_for_improvement")
        achievement_quality=response.get("achievement_quality_explanation")
        resume_analysis = ResumeAnalysis.objects.create(
            job_application=job_application,
            resume_path=resume_path,
            resume_name=resume_name,
            resume_review_score=response.get("resume_review_score"),
            skill_matching_score=response.get("skill_matching_score"),
            experience_relevance_score=response.get("experience_relevance_score"),
            education_certifications_score=response.get(
                "education_certifications_score"
            ),
            total_score=response.get("total_score"),
            recommendation=recommendation,
            detailed_analysis=response.get("detailed_analysis"),
            areas_for_improvement=areas_for_improvement,
            strengths=response.get("strengths"),
            role_match_status=response.get("role_match_status"),
            text_authencity=response.get("text_authenticity"),
            text_authencity_explanation=response.get("text_authenticity_explanation"),
            experience_validation=response.get("experience_validation"),
            experience_validation_explanation=response.get("experience_validation_explanation"),
            achievement_quality=achievement_quality,
        )
        company_id = getattr(job_application.job, "company_id", None)
        if company_id:
            from tags.tasks import evaluate_company_tags
            evaluate_company_tags.delay(company_id)
        return resume_analysis, recommendation, areas_for_improvement
    return None, None, None


@shared_task
def carry_out_resume_analysis(job_application_id):
    """This function is called immediately after a user applies for a job that is marked as `hire with AI`"""

    job_application = (
        JobApplication.objects.prefetch_related("job", "applicant")
        .filter(id=job_application_id)
        .first()
    )

    if job_application:
        flow_status, _ = ReportPAYGFlowStatus.objects.get_or_create(job_application=job_application)
        flow_status.status = ReportPAYGFlowStatus.Status.STARTED
        flow_status.error_message = ""
        flow_status.save()
        job = job_application.job
        talent_profile = job_application.applicant
        logger.info(f"Job: {job}, Talent Profile: {talent_profile}, Resume: {talent_profile.resume}")
        if job and talent_profile and talent_profile.resume:
            job_id = job.id
            talent_profile_id = talent_profile.id
            job_application.id = job_application.id
            resume_path = talent_profile.resume
            resume_name = talent_profile.resume.name
            resume_analysis_obj, recommendation, areas_for_improvement = (
                on_analyze_resume(
                    job_application=job_application,
                    resume_name=resume_name,
                    resume_path=resume_path,
                    job_description=job.description,
                )
            )
            # if resume analysis was successful
            if resume_analysis_obj:
                #billed them after the analysos of the applicant resume
                try:
                    bill_service(job_application, "resume_screening")
                except Exception as e:
                    flow_status.status = ReportPAYGFlowStatus.Status.FAILED
                    flow_status.error_message = f"Billing error: {str(e)}"
                    flow_status.save()
                    logger.error("cant bill for analysis")
                #create_talent_screening(job_application, resume_analysis_obj)
                if talent_profile.user:
                    logger.warning(f"Recommendation: {recommendation}")
                    logger.warning(f"areas_for_improvement: {areas_for_improvement}")
                    logger.warning(f"Total Score: {resume_analysis_obj.total_score}")
                    if resume_analysis_obj.total_score >= job.get_screening_threshold():
                        send_assessment_link.apply_async(
                            args=[job_application_id],
                            countdown=ACCEPTANCE_MAIL_DELAY_SECONDS,
                        )
                    else:
                        send_rejection_mail.apply_async(
                            args=[job_id, talent_profile_id, areas_for_improvement],
                            countdown=REJECTION_MAIL_DELAY_SECONDS,
                        )
                flow_status.status = ReportPAYGFlowStatus.Status.COMPLETED
                flow_status.error_message = ""
                flow_status.save()
                return "Completed"
            else:
                PendingResumeAnalysis.objects.create(
                    job_application=job_application,
                    resume_path=resume_path,
                    resume_name=resume_name,
                )
                flow_status.status = ReportPAYGFlowStatus.Status.FAILED
                flow_status.error_message = "Resume analysis returned no object"
                flow_status.save()
        else:
            # Handle missing resume or invalid data
            flow_status.status = ReportPAYGFlowStatus.Status.FAILED
            if not talent_profile:
                flow_status.error_message = "Talent profile not found"
            elif not talent_profile.resume:
                flow_status.error_message = "Resume not found for talent"
            else:
                flow_status.error_message = "Invalid job or talent data"
            flow_status.save()
            return f"Resume analysis failed: {flow_status.error_message}"
 
    return f"@task:carry_out_resume_analysis failed | params: job_application_id -> {job_application_id}"


@shared_task(name="carry_out_pending_resume_analyses")
def carry_out_pending_resume_analyses():
    """Carry out resume analyses that failed on the first try or on subsequent tries"""

    pending_analyses = (
        PendingResumeAnalysis.objects.all()
        .prefetch_related("job_application__job", "job_application__applicant")
        .order_by("created_at")
    )
    for pending_resume_analysis in pending_analyses:
        job_application: JobApplication = pending_resume_analysis.job_application
        if job_application:
            flow_status, _ = ReportPAYGFlowStatus.objects.get_or_create(job_application=job_application)
            flow_status.status = ReportPAYGFlowStatus.Status.STARTED
            flow_status.error_message = ""
            flow_status.save()
            talent_profile = job_application.applicant
            job = job_application.job
            resume_name = pending_resume_analysis.resume_name
            resume_path = pending_resume_analysis.resume_path
            resume_analysis_obj, recommendation, areas_for_improvement = (
                on_analyze_resume(
                    job_application=pending_resume_analysis.job_application,
                    resume_name=resume_name,
                    resume_path=resume_path,
                    job_description=job.description,
                )
            )
            if resume_analysis_obj:
                #bill them here for resume analysis
                try:
                    bill_service(job_application, "resume_screening")
                except Exception as e:
                    flow_status.status = ReportPAYGFlowStatus.Status.FAILED
                    flow_status.error_message = f"Billing error during retry: {str(e)}"
                    flow_status.save()
                    logger.error("cant bill for pending analysis")

                # At this point the (billable) AI analysis has already succeeded and
                # been saved. A failure in the downstream steps below must NOT leave the
                # pending record in place, otherwise this sweeper re-runs the AI analysis
                # on every beat tick and burns OpenAI credits indefinitely. So we always
                # delete the pending record and surface downstream errors via flow_status.
                downstream_error = None
                try:
                    create_talent_screening(job_application, resume_analysis_obj)
                    if talent_profile.user:
                        if resume_analysis_obj.total_score >= job.get_screening_threshold():
                            send_assessment_link.apply_async(
                                args=[job_application.id],
                                countdown=ACCEPTANCE_MAIL_DELAY_SECONDS,
                            )
                        else:
                            send_rejection_mail.apply_async(
                                args=[job.id, talent_profile.id, areas_for_improvement],
                                countdown=REJECTION_MAIL_DELAY_SECONDS,
                            )
                except Exception as e:
                    downstream_error = str(e)
                    logger.error(
                        "Post-analysis step failed for pending resume analysis "
                        f"(job_application_id={job_application.id}): {e}"
                    )

                pending_resume_analysis.delete()

                if downstream_error:
                    flow_status.status = ReportPAYGFlowStatus.Status.FAILED
                    flow_status.error_message = f"Post-analysis error: {downstream_error}"
                else:
                    flow_status.status = ReportPAYGFlowStatus.Status.COMPLETED
                    flow_status.error_message = ""
                flow_status.save()

                
