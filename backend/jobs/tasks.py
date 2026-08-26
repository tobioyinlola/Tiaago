import logging
import uuid
from datetime import timedelta
from django.db import transaction
from django.contrib.auth import get_user_model
from celery import shared_task
from celery.exceptions import Retry
from emails import emails
from jobs.constants import NON_TECHNICAL_ASSESSMENT_CATEGORIES, TECHNICAL_ASSESSMENT_CATEGORIES
from jobs.models import (
    AssessmentQuestionGenerationRequest,
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
from utils.ai_service import AIService
from utils.email_handler import EmailHandler, EmailTypes
import time
import requests

from django.conf import settings
from django.utils.timezone import now
from payments.models import UsageEvent,ReportPAYGFlowStatus
from django.db.models import Count
from subscriptions.models import UserUsage, WalletUserUsage
from subscriptions.helper import has_active_subscription_capacity
from subscriptions.billing_service import BillingService
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
                fee_note=f"Resume screening for {job_application.candidate_full_name} for job {job_application.job.title}",
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
        fee_note = f"Skill Assessment fee for {job_application.candidate_full_name} for job {job_application.job.title}"
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


def _billing_notification_recipients(company):
    """Every company team member plus company_rep, deduped -- shared by the
    wallet-exhaustion pause/resume notify tasks below."""
    from create_user.models import CompanyTeamMember

    members = CompanyTeamMember.objects.select_related("user").filter(company=company)
    recipients = {m.user for m in members if m.user and m.user.email}
    company_rep = getattr(company, "company_rep", None)
    if company_rep and company_rep.email:
        recipients.add(company_rep)
    return list(recipients)


@shared_task(name="notify_jobs_paused_for_billing")
def notify_jobs_paused_for_billing(company_id, job_ids):
    """Emails every recipient that their jobs were auto-paused because the
    company's wallet ran out -- see
    subscriptions.billing_service._pause_company_jobs_for_wallet_exhaustion."""
    from create_user.models import Company

    company = Company.objects.filter(id=company_id).first()
    if not company:
        logger.error("notify_jobs_paused_for_billing: company %s not found", company_id)
        return

    job_titles = [job.title for job in Job.objects.filter(id__in=job_ids)]
    if not job_titles:
        return

    wallet_url = f"{str(settings.FRONTEND_URL).rstrip('/')}/recruiter/dashboard/billing"
    for user in _billing_notification_recipients(company):
        try:
            emails.jobs_paused_for_billing_mail(user, job_titles, wallet_url)
        except Exception:
            logger.exception("Failed to send jobs-paused-for-billing email to %s", user.email)


@shared_task(name="notify_jobs_reactivated_after_topup")
def notify_jobs_reactivated_after_topup(company_id, job_ids):
    """Emails every recipient that their auto-paused jobs are active again
    after a wallet top-up -- see
    subscriptions.billing_service._resume_company_jobs_after_wallet_topup."""
    from create_user.models import Company

    company = Company.objects.filter(id=company_id).first()
    if not company:
        logger.error("notify_jobs_reactivated_after_topup: company %s not found", company_id)
        return

    job_titles = [job.title for job in Job.objects.filter(id__in=job_ids)]
    if not job_titles:
        return

    wallet_url = f"{str(settings.FRONTEND_URL).rstrip('/')}/recruiter/dashboard/billing"
    for user in _billing_notification_recipients(company):
        try:
            emails.jobs_reactivated_after_topup_mail(user, job_titles, wallet_url)
        except Exception:
            logger.exception("Failed to send jobs-reactivated-after-topup email to %s", user.email)


@shared_task
def send_rejection_mail(job_id, job_application_id, areas_for_improvement=None):
    """
    Send a rejection mail to an applicant.\n
    This is sent after AI analyzes the applicant's resume and marks them as unfit for the role
    """
    logger.info(f"send_rejection_mail called with job_id={job_id}, job_application_id={job_application_id}")
    job = Job.objects.filter(id=job_id).first()
    job_application = JobApplication.objects.filter(id=job_application_id).first()
    if job and job_application:
        emails.applicant_vetting_mail(
            job_application.as_email_recipient(),
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

    # Idempotency guard: GeneralSkillAssessment.job_application is a plain FK
    # (not unique), and this task can be re-delivered by Celery (worker crash/
    # visibility-timeout redelivery) or invoked twice from an upstream trigger.
    # Without this check, a re-run would silently create a second assessment
    # row -- a second invite email/token and a second billing charge for the
    # same application.
    if GeneralSkillAssessment.objects.filter(job_application=job_application).exists():
        logger.warning(
            "send_assessment_link: assessment already exists for job_application %s, skipping duplicate creation",
            job_application_id,
        )
        return "Assessment already exists for this application"

    company = job_application.job.company
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
    # job.role is free text (not a Role FK) -- resolve is_technical via a
    # case-insensitive title lookup. Defaults to non-technical when no
    # matching Role row exists: most recruiter-typed role titles that don't
    # match anything are ordinary (non-engineering) roles, and wrongly
    # defaulting those to "technical" was bolting an unwanted coding-task
    # section onto assessments for roles that never asked for one (see the
    # `if is_technical:` block below, under `if use_template:`).
    matched_role = Role.objects.filter(title__iexact=job.role).first()
    is_technical = matched_role.is_technical if matched_role else False
    candidate_name = job_application.candidate_full_name
    if job:
        job_difficulty = "beginner"
        coding_task_difficulty_level = "Easy"
        assessment_difficulty_level = SkillAssessmentDifficultyLevels.JUNIOR
        if job.job_level == Job.JobLevel.INTERMEDIATE:
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
                    title=f"Assessment for {job.role} role at {job.company.company_name} for  {candidate_name}",
                    published=True,
                    difficulty_level=assessment_difficulty_level,
                    description=f"Assessment for {job.role} role at {job.company.company_name} for  {candidate_name}",
                    duration_minutes=duration_minutes,
                    passing_grade=job.get_passing_grade(),
                    reference=str(uuid.uuid4().hex)[:15],
                    assessment_id=assessment_id if is_technical else None,
                    assessment_type=SkillAssessmentTypes.CUSTOM,
                    job_application=job_application,
                    # A guest applicant has no TalentProfile -- reuse the
                    # existing standalone-invite identity mechanism
                    # (skill_assessment.utils.get_assessment_candidate_name/
                    # email already fall back to these) instead of adding a
                    # second guest-branching path there.
                    invited_email=job_application.guest_email if not job_application.applicant_id else "",
                    invited_name=job_application.guest_full_name if not job_application.applicant_id else "",
                )
                # attach skillset/role -- skillsets is a Role FK M2M, so resolve
                # (or create) a Role row matching job.role's free-text title.
                # Carries the is_technical we already resolved above onto a
                # newly-created row, so a later job with this same free-text
                # title doesn't get a fresh, unrelated model-default guess.
                skillset_role = matched_role or Role.objects.create(title=job.role, is_technical=is_technical)
                company_skill_assessment.skillsets.set([skillset_role])

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
                            title=f"Coding Task for {job.role} role - Applicant {candidate_name}",
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

        # Billing happens here, right before the invite actually goes out --
        # an active subscription seat is used first (has_active_subscription_capacity),
        # falling back to the wallet (free credit, then a real charge) only
        # if the company has no subscription capacity left. Insufficient
        # wallet funds blocks the send entirely -- the candidate never gets
        # an assessment the company hasn't paid for.
        usage = UserUsage.objects.filter(company=company).first()
        if not has_active_subscription_capacity(company, usage, determiner="assessment"):
            billing_result = BillingService.process_assessment_charge(job_application)
            if not billing_result["success"]:
                flow_status.status = ReportPAYGFlowStatus.Status.FAILED
                flow_status.error_message = (
                    "Insufficient wallet balance -- assessment invite not sent. "
                    "The recruiter must top up their wallet to continue."
                )
                flow_status.save()
                logger.warning(
                    "Assessment not sent for job_application %s: insufficient wallet balance",
                    job_application_id,
                )
                return "Insufficient wallet balance"
        # Deadline is always exactly 72h from the moment the invite email is
        # actually sent -- set here, not at row creation, so it reflects the
        # real send time even if billing/question-generation above took a
        # while.
        company_skill_assessment.invite_sent_at = now()
        company_skill_assessment.invite_deadline = company_skill_assessment.invite_sent_at + timedelta(hours=72)
        company_skill_assessment.save(update_fields=["invite_sent_at", "invite_deadline"])

        logger.info(f"Attempting to send applicant vetting mail to {job_application.candidate_email}")
        try:
            emails.applicant_vetting_mail(
                job_application.as_email_recipient(), job, "consider",
                assessment_link=assessment_link,
                duration_minutes=company_skill_assessment.duration_minutes,
                deadline=company_skill_assessment.invite_deadline,
                has_coding_task=bool(coding_questions),
            )
        except Exception as e:
            # Billing and the assessment row above are already committed --
            # retrying via try_again() (which re-runs this task from the top)
            # would re-charge the company and create a duplicate assessment,
            # so a failure here is logged and surfaced instead of retried.
            logger.exception("Failed to send applicant vetting mail: %s", e)
            flow_status.status = ReportPAYGFlowStatus.Status.FAILED
            flow_status.error_message = f"Failed to send assessment invite email: {e}"
            flow_status.save()
            return f"Failed to send assessment invite email: {e}"
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
    try:
        response = AIService.analyze_resume(
            resume_name=resume_name,
            resume_path=resume_path,
            job_description=job_description,
        )
    except Exception:
        # AI service unreachable/erroring must never crash the whole task --
        # fall through to the same "no response" path below so the caller's
        # existing PendingResumeAnalysis retry mechanism picks it up instead
        # of silently losing this application's screening forever.
        logger.exception(
            "Resume analysis call failed for job_application %s", job_application.id
        )
        response = None
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


@shared_task(rate_limit="60/m")
def carry_out_resume_analysis(job_application_id):
    """This function is called immediately after a user applies for a job that is marked as `hire with AI`.

    rate_limit caps how many of these run per minute across all workers --
    without it, a burst of applications landing at once (many candidates
    across many companies applying near-simultaneously) would fire an equally
    large burst of concurrent AI-service calls. A failure here isn't lost --
    on_analyze_resume returning nothing already routes to PendingResumeAnalysis
    for the (separately rate-limited) retry sweep -- but better to shape the
    load up front than lean entirely on that safety net. Tune to whatever the
    AI service/OpenAI tier can actually sustain alongside every other caller
    (assessment generation/grading, AI interviews) sharing the same budget."""

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
        resume = job_application.candidate_resume
        logger.info(f"Job: {job}, Candidate: {job_application.candidate_full_name}, Resume: {resume}")
        if job and resume:
            job_id = job.id
            resume_path = resume
            resume_name = resume.name
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
                # Billed after the analysis completes -- an active
                # subscription seat is used first, falling back to the
                # wallet (free credit, then a real charge). Insufficient
                # wallet funds stops the candidate here: no assessment/
                # rejection email goes out, and flow_status.FAILED is what
                # the recruiter's applications list reads to keep this
                # candidate out of the visible pipeline until they top up.
                company = job.company
                usage = UserUsage.objects.filter(company=company).first()
                if not has_active_subscription_capacity(company, usage, determiner="resume-analyzes"):
                    billing_result = BillingService.process_resume_candidate_screening(job_application)
                    if not billing_result["success"]:
                        flow_status.status = ReportPAYGFlowStatus.Status.FAILED
                        flow_status.error_message = (
                            "Insufficient wallet balance -- resume screening result withheld. "
                            "The recruiter must top up their wallet to continue."
                        )
                        flow_status.save()
                        logger.warning(
                            "Resume screening withheld for job_application %s: insufficient wallet balance",
                            job_application_id,
                        )
                        return "Insufficient wallet balance"
                #create_talent_screening(job_application, resume_analysis_obj)
                logger.warning(f"Recommendation: {recommendation}")
                logger.warning(f"areas_for_improvement: {areas_for_improvement}")
                logger.warning(f"Total Score: {resume_analysis_obj.total_score}")
                if resume_analysis_obj.total_score >= job.get_screening_threshold():
                    # Auto-advance to the next stage -- surfaced on the View
                    # Applicants table so recruiters see candidates move
                    # forward without manual status changes.
                    JobApplication.objects.filter(id=job_application_id).update(
                        status=JobApplication.JobApplicationStatus.REVIEWED
                    )
                    send_assessment_link.apply_async(
                        args=[job_application_id],
                        countdown=ACCEPTANCE_MAIL_DELAY_SECONDS,
                    )
                else:
                    JobApplication.objects.filter(id=job_application_id).update(
                        status=JobApplication.JobApplicationStatus.REJECTED
                    )
                    send_rejection_mail.apply_async(
                        args=[job_id, job_application_id, areas_for_improvement],
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
            if not resume:
                flow_status.error_message = "Resume not found for candidate"
            else:
                flow_status.error_message = "Invalid job or candidate data"
            flow_status.save()
            return f"Resume analysis failed: {flow_status.error_message}"
 
    return f"@task:carry_out_resume_analysis failed | params: job_application_id -> {job_application_id}"


# carry_out_pending_resume_analyses runs on a 15-minute celery-beat schedule
# (talentsync_backend/celery.py) with no other backoff -- without a cap, a
# resume the AI service can never parse gets re-sent to it (a real, billable
# call) every single tick forever.
MAX_PENDING_RESUME_ANALYSIS_ATTEMPTS = 5


@shared_task(name="carry_out_pending_resume_analyses")
def carry_out_pending_resume_analyses():
    """Fans out one independent task per pending resume analysis instead of
    processing them inline in a single sequential loop. Each retry is a real,
    blocking OpenAI call (several seconds) -- a burst of failures (e.g. many
    candidates applying near-simultaneously while the AI service was briefly
    overloaded) used to pin this one task working through the backlog one
    candidate at a time, potentially for hours, blocking a worker slot and
    delaying every other pending item behind it. Dispatching each item as its
    own task lets Celery's normal concurrency plus retry_pending_resume_analysis's
    rate_limit share the backlog safely instead of serializing it."""
    pending_ids = list(
        PendingResumeAnalysis.objects.order_by("created_at").values_list("id", flat=True)
    )
    for pending_id in pending_ids:
        retry_pending_resume_analysis.delay(pending_id)
    return f"Dispatched {len(pending_ids)} pending resume analysis retries"


@shared_task(name="retry_pending_resume_analysis", rate_limit="30/m")
def retry_pending_resume_analysis(pending_resume_analysis_id):
    """One candidate's resume-analysis retry (see carry_out_pending_resume_analyses).
    rate_limit caps this at 30/minute across all workers so a large backlog
    can't hammer the AI service (and, transitively, OpenAI's own rate limits)
    all at once -- tune to whatever the AI service can actually sustain."""
    pending_resume_analysis = (
        PendingResumeAnalysis.objects.select_related("job_application__job", "job_application__applicant")
        .filter(id=pending_resume_analysis_id)
        .first()
    )
    if not pending_resume_analysis:
        return "Pending resume analysis not found -- already processed or deleted"

    job_application: JobApplication = pending_resume_analysis.job_application
    if not job_application:
        pending_resume_analysis.delete()
        return "Orphaned pending resume analysis deleted (no job application)"

    flow_status, _ = ReportPAYGFlowStatus.objects.get_or_create(job_application=job_application)

    if pending_resume_analysis.attempts >= MAX_PENDING_RESUME_ANALYSIS_ATTEMPTS:
        logger.error(
            "Giving up on pending resume analysis for job_application %s after %s attempts",
            job_application.id, pending_resume_analysis.attempts,
        )
        pending_resume_analysis.delete()
        flow_status.status = ReportPAYGFlowStatus.Status.FAILED
        flow_status.error_message = (
            f"Resume could not be analyzed after {MAX_PENDING_RESUME_ANALYSIS_ATTEMPTS} attempts. "
            "Giving up -- please contact support if this persists."
        )
        flow_status.save()
        return "Gave up after max attempts"

    flow_status.status = ReportPAYGFlowStatus.Status.STARTED
    flow_status.error_message = ""
    flow_status.save()
    job = job_application.job
    resume_name = pending_resume_analysis.resume_name
    resume_path = pending_resume_analysis.resume_path
    resume_analysis_obj, recommendation, areas_for_improvement = (
        on_analyze_resume(
            job_application=job_application,
            resume_name=resume_name,
            resume_path=resume_path,
            job_description=job.description,
        )
    )
    if not resume_analysis_obj:
        pending_resume_analysis.attempts += 1
        pending_resume_analysis.save(update_fields=["attempts"])
        flow_status.status = ReportPAYGFlowStatus.Status.FAILED
        flow_status.error_message = (
            f"Resume analysis attempt {pending_resume_analysis.attempts}/"
            f"{MAX_PENDING_RESUME_ANALYSIS_ATTEMPTS} failed -- will retry."
        )
        flow_status.save()
        return "Attempt failed -- will retry on next sweep"

    # Bill for the resume screening, same rule as the primary path in
    # carry_out_resume_analysis: subscription seat first, wallet (free
    # credit then real charge) fallback.
    company = job.company
    usage = UserUsage.objects.filter(company=company).first()
    billing_blocked = False
    if not has_active_subscription_capacity(company, usage, determiner="resume-analyzes"):
        billing_result = BillingService.process_resume_candidate_screening(job_application)
        billing_blocked = not billing_result["success"]

    # At this point the (billable) AI analysis has already succeeded and
    # been saved. A failure in the downstream steps below must NOT leave the
    # pending record in place, otherwise this sweeper re-runs the AI analysis
    # on every beat tick and burns OpenAI credits indefinitely. So we always
    # delete the pending record and surface downstream errors via flow_status.
    downstream_error = None
    if billing_blocked:
        downstream_error = (
            "Insufficient wallet balance -- resume screening result withheld. "
            "The recruiter must top up their wallet to continue."
        )
    else:
        try:
            create_talent_screening(job_application, resume_analysis_obj)
            if resume_analysis_obj.total_score >= job.get_screening_threshold():
                send_assessment_link.apply_async(
                    args=[job_application.id],
                    countdown=ACCEPTANCE_MAIL_DELAY_SECONDS,
                )
            else:
                send_rejection_mail.apply_async(
                    args=[job.id, job_application.id, areas_for_improvement],
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
    return "Completed"


@shared_task(bind=True, name="generate_job_assessment_questions_task", max_retries=2, rate_limit="30/m")
def generate_job_assessment_questions_task(self, request_id, description, job_requirement, role_id):
    """Runs the job-creation wizard's Step 3 AI question generation out of
    band -- see jobs.views.GenerateAssessmentQuestionsView, which used to make
    this call synchronously (up to the AI service's 240s ceiling) inside the
    request/response cycle. Retries on transport failures the same way
    skill_assessment.tasks.create_talent_coding_assessment_task_v2 does.
    rate_limit shares the same AI-service capacity budget as resume screening
    and grading -- see carry_out_resume_analysis's rate_limit comment."""
    request_row = AssessmentQuestionGenerationRequest.objects.filter(id=request_id).first()
    if not request_row:
        logger.warning("AssessmentQuestionGenerationRequest %s not found", request_id)
        return

    request_row.status = AssessmentQuestionGenerationRequest.GenerationStatus.GENERATING
    request_row.save(update_fields=["status"])

    job_description = "\n\n".join(part for part in [description, job_requirement] if part)

    # Defaults non-technical when role_id doesn't match an existing Role --
    # see jobs.tasks.send_assessment_link for the matching fix and why.
    is_technical = False
    if role_id:
        if isinstance(role_id, int) or (isinstance(role_id, str) and str(role_id).strip().isdigit()):
            role = Role.objects.filter(id=int(role_id)).first()
        else:
            role = Role.objects.filter(title__iexact=str(role_id).strip()).first()
        if role:
            is_technical = role.is_technical

    categories = TECHNICAL_ASSESSMENT_CATEGORIES if is_technical else NON_TECHNICAL_ASSESSMENT_CATEGORIES

    try:
        sections = AIService.get_categorized_mcq_questions(
            job_description=job_description,
            categories=categories,
            questions_per_category=10,
            role_type="technical" if is_technical else "non-technical",
        )
    except Exception as e:
        if self.request.retries < self.max_retries:
            countdown = 30 * (self.request.retries + 1)
            logger.warning(
                "Assessment question generation failed for request %s -- retry %s in %ss: %s",
                request_id, self.request.retries + 1, countdown, e,
            )
            raise self.retry(exc=e, countdown=countdown)
        logger.exception("Assessment question generation failed after max retries for request %s", request_id)
        sections = None

    if not sections:
        request_row.status = AssessmentQuestionGenerationRequest.GenerationStatus.FAILED
        request_row.error = "Failed to generate assessment questions. Please try again."
        request_row.save(update_fields=["status", "error"])
        return {"status": "failed", "id": str(request_id)}

    request_row.status = AssessmentQuestionGenerationRequest.GenerationStatus.READY
    request_row.sections = sections
    request_row.save(update_fields=["status", "sections"])
    return {"status": "ready", "id": str(request_id)}


@shared_task(name="send_interview_slot_invite")
def send_interview_slot_invite(job_application_id):
    """Invites a candidate to pick a human-interview time from the slots the
    recruiter published for this job (JobInterviewAvailabilitySlot), sourced
    directly from job_application/job -- no CandidateAssessmentSubmission
    required, unlike skill_assessment.tasks.send_interview_slot_selection_invite
    (which this deliberately doesn't touch, since it's already live on the
    automatic assessment-pass path). Used by two callers: a recruiter
    manually moving a candidate to PENDING_DECISION on a non-AI-interview job
    (see jobs.views.JobApplicationRetrieveUpdateView.put), and
    ai_interviews.tasks.send_ai_interview_proceed_invite, which delegates
    here instead of re-implementing this same branching."""
    from scheduler.models import Scheduler
    from skill_assessment.models import GeneralSkillAssessment

    job_application = JobApplication.objects.select_related("job", "job__company").filter(
        id=job_application_id
    ).first()
    if not job_application:
        return

    job = job_application.job
    # A prior Scheduler row means this candidate already had (at least) a
    # first round -- see jobs.views._claim_interview_slot's round=count()+1
    # -- so this fresh invite (fired from either the manual PENDING_DECISION
    # move or scheduler.review_views.AdvanceInterviewRoundView) is for their
    # second round.
    is_second_round = Scheduler.objects.filter(job_application=job_application).exists()

    if not job.interview_availability_slots.filter(is_claimed=False).exists():
        logger.warning(
            "send_interview_slot_invite: no published interview slots for job %s (job_application %s)",
            job.id, job_application_id,
        )
        return

    base = str(settings.FRONTEND_URL).rstrip("/")
    if job_application.applicant_id:
        slots_url = f"{base}/talents/jobs/{job.public_id}/interview-slots"
    else:
        # Guest applicant -- no login to reach the talent-only slots page,
        # so route through the same token-based guest flow used by
        # skill_assessment.tasks.send_interview_slot_selection_invite.
        assessment = GeneralSkillAssessment.objects.filter(job_application=job_application).first()
        if not assessment:
            logger.warning(
                "send_interview_slot_invite: no assessment invite_token for guest job_application %s",
                job_application.id,
            )
            return
        slots_url = f"{base}/jobs/interview-slots/{assessment.invite_token}"

    candidate_email = job_application.candidate_email
    candidate_name = job_application.candidate_full_name
    if not candidate_email:
        logger.warning("send_interview_slot_invite: no candidate email for job_application %s", job_application_id)
        return
    first_name = (candidate_name or "").split(" ")[0]

    context = {
        "first_name": first_name,
        "company": job.company.company_name,
        "role": job.title,
        "slots_url": slots_url,
    }
    try:
        EmailHandler(recipients=[candidate_email]).send_mail(
            subject="Pick your second interview time" if is_second_round else "Pick your interview time",
            context=context,
            template="emails/interview_slot_selection.html",
            email_type=EmailTypes.INTERVIEW_SLOT_SELECTION_MAIL,
        )
    except Exception:
        logger.exception("Failed to send interview slot selection invite for job_application %s", job_application_id)


@shared_task(name="send_vendor_interview_invite")
def send_vendor_interview_invite(job_application_id):
    """Emails the candidate the link to a third-party AI interview when a
    recruiter moves them into VENDOR_AI_INTERVIEW on the applications board.

    This stage has no vendor API behind it -- the recruiter runs the interview
    in the vendor's own product and pastes the candidate's link onto the
    application (JobApplication.vendor_name / vendor_interview_url, both
    required by JobApplicationRetrieveUpdateView.put before the move is
    allowed). All this task does is relay that link, so the candidate hears
    about it from us rather than being left on a stage with no signal --
    matching send_interview_slot_invite's role for the in-house flow."""
    job_application = JobApplication.objects.select_related("job", "job__company").filter(
        id=job_application_id
    ).first()
    if not job_application:
        return

    vendor_name = (job_application.vendor_name or "").strip()
    vendor_url = (job_application.vendor_interview_url or "").strip()
    if not vendor_name or not vendor_url:
        logger.warning(
            "send_vendor_interview_invite: job_application %s has no vendor name/url", job_application_id
        )
        return

    candidate_email = job_application.candidate_email
    if not candidate_email:
        logger.warning("send_vendor_interview_invite: no candidate email for job_application %s", job_application_id)
        return

    job = job_application.job
    context = {
        "first_name": (job_application.candidate_full_name or "").split(" ")[0],
        "company": job.company.company_name,
        "role": job.title,
        "vendor_name": vendor_name,
        "vendor_url": vendor_url,
    }
    try:
        EmailHandler(recipients=[candidate_email]).send_mail(
            subject=f"Your interview for {job.title} at {job.company.company_name}",
            context=context,
            template="emails/vendor_interview_invite.html",
            email_type=EmailTypes.INTERVIEW_SLOT_SELECTION_MAIL,
        )
    except Exception:
        logger.exception("Failed to send vendor interview invite for job_application %s", job_application_id)


@shared_task(name="send_manual_rejection_mail")
def send_manual_rejection_mail(job_application_id, reason):
    """Fired when a recruiter manually moves a candidate to REJECTED on the
    applications board (see jobs.views.JobApplicationRetrieveUpdateView.put).
    Reuses the same vetting-fail email the automatic resume-screening-reject
    path already sends (emails.applicant_vetting_mail / emails/vetting_fail.html)
    -- its copy is generic ("the team has decided not to move forward...
    areas to focus on") rather than resume-specific, so it reads correctly
    for a reject at any pipeline stage, not just resume screening."""
    job_application = JobApplication.objects.select_related("job", "job__company").filter(
        id=job_application_id
    ).first()
    if not job_application:
        return
    try:
        emails.applicant_vetting_mail(
            job_application.as_email_recipient(),
            job_application.job,
            "unconsider",
            areas_for_improvement=reason,
        )
    except Exception:
        logger.exception("Failed to send manual rejection mail for job_application %s", job_application_id)


@shared_task(name="send_interview_scheduled_notice_mail")
def send_interview_scheduled_notice_mail(job_application_id):
    """Fired when a recruiter manually moves a candidate to
    INTERVIEW_SCHEDULED on the applications board (see
    jobs.views.JobApplicationRetrieveUpdateView.put) -- previously a silent
    status write with no candidate-facing signal at all, unlike every other
    stage move. Deliberately generic (see emails.interview_scheduled_notice_mail)
    since this bypass doesn't go through the real slot-claim/Daily.co flow
    that jobs.views._claim_interview_slot's own confirmation email covers."""
    job_application = JobApplication.objects.select_related("job", "job__company").filter(
        id=job_application_id
    ).first()
    if not job_application:
        return
    try:
        emails.interview_scheduled_notice_mail(
            job_application.as_email_recipient(),
            job_application.job.company.company_name,
            job_application.job.title,
        )
    except Exception:
        logger.exception("Failed to send interview scheduled notice for job_application %s", job_application_id)


@shared_task(name="send_offer_extended_notice_mail")
def send_offer_extended_notice_mail(job_application_id):
    """Fired when a recruiter moves a candidate to OFFER_EXTENDED on the
    applications board -- previously no candidate-facing signal at all."""
    job_application = JobApplication.objects.select_related("job", "job__company").filter(
        id=job_application_id
    ).first()
    if not job_application:
        return
    try:
        emails.offer_extended_notice_mail(
            job_application.as_email_recipient(),
            job_application.job.company.company_name,
            job_application.job.title,
        )
    except Exception:
        logger.exception("Failed to send offer extended notice for job_application %s", job_application_id)

