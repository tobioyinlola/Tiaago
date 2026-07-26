"""Writes NormalizedCandidate/NormalizedJob dicts (see providers.base) into
our own DB, upserting on (company, provider, external_id) so re-syncing an
already-connected ATS never creates duplicates."""

from datetime import datetime

from loguru import logger

from django.utils.dateparse import parse_datetime
from django.utils.timezone import is_naive, make_aware

from create_user.models import Company, CustomUser, TalentProfile
from jobs.models import Job, JobApplication

from .models import AtsCandidate, AtsJob


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = parse_datetime(value)
    if parsed and is_naive(parsed):
        parsed = make_aware(parsed)
    return parsed


def upsert_candidate(company: Company, provider: str, normalized: dict) -> AtsCandidate:
    obj, _created = AtsCandidate.objects.update_or_create(
        company=company,
        provider=provider,
        external_id=normalized["external_id"],
        defaults={
            "first_name": normalized.get("first_name", ""),
            "last_name": normalized.get("last_name", ""),
            "email": normalized.get("email", ""),
            "phone": normalized.get("phone", ""),
            "resume_url": normalized.get("resume_url", ""),
            "stage": normalized.get("stage", ""),
            "source": normalized.get("source", ""),
            "tags": normalized.get("tags") or [],
            "ats_job_external_ids": normalized.get("ats_job_external_ids") or [],
            "location": normalized.get("location", ""),
            "linkedin_url": normalized.get("linkedin_url", ""),
            "portfolio_urls": normalized.get("portfolio_urls") or [],
            "current_title": normalized.get("current_title", ""),
            "current_company": normalized.get("current_company", ""),
            "cover_letter": normalized.get("cover_letter", ""),
            "education": normalized.get("education") or [],
            "work_experience": normalized.get("work_experience") or [],
            "application_answers": normalized.get("application_answers") or [],
            "ats_created_at": _parse_dt(normalized.get("ats_created_at")),
            "raw_data": normalized.get("raw") or {},
        },
    )
    return obj


def upsert_job(company: Company, provider: str, normalized: dict) -> AtsJob:
    obj, _created = AtsJob.objects.update_or_create(
        company=company,
        provider=provider,
        external_id=normalized["external_id"],
        defaults={
            "title": normalized.get("title", ""),
            "description": normalized.get("description", ""),
            "location": normalized.get("location", ""),
            "department": normalized.get("department", ""),
            "employment_type": normalized.get("employment_type", ""),
            "status": normalized.get("status") or AtsJob.Status.UNKNOWN,
            "salary_min": normalized.get("salary_min"),
            "salary_max": normalized.get("salary_max"),
            "salary_currency": normalized.get("salary_currency", ""),
            "ats_created_at": _parse_dt(normalized.get("ats_created_at")),
            "raw_data": normalized.get("raw") or {},
        },
    )
    return obj


def convert_ats_candidate_to_application(candidate: AtsCandidate, job: Job) -> JobApplication | None:
    """Turns a synced AtsCandidate into an ordinary JobApplication, mirroring
    GuestJobApplicationSerializer.create(): resolve-or-provision a
    CustomUser/TalentProfile by email, then create the application. Returns
    None (never raises) for a candidate with no email -- there's no way to
    provision an account without one, and one bad candidate row must never
    abort the rest of the conversion."""
    if not candidate.email:
        logger.warning(f"Skipping AtsCandidate {candidate.id}: no email, cannot provision an application account")
        return None

    user = CustomUser.objects.filter(email__iexact=candidate.email).first()
    if not user:
        user = CustomUser.objects.create_user(
            username=candidate.email,
            email=candidate.email,
            first_name=candidate.first_name,
            last_name=candidate.last_name,
            phone_number=candidate.phone,
            user_type=CustomUser.USER_TYPE.TALENT,
            is_verified=False,
            password=None,
        )

    talent_profile = TalentProfile.objects.filter(user=user).first()
    if not talent_profile:
        full_name = f"{candidate.first_name} {candidate.last_name}".strip()
        talent_profile = TalentProfile.objects.create(
            user=user, full_name=full_name, linkedin_url=candidate.linkedin_url or "",
        )

    application, _created = JobApplication.objects.get_or_create(
        applicant=talent_profile,
        job=job,
        defaults={
            "cover_letter": candidate.cover_letter or "",
            "is_external_application": True,
        },
    )
    return application
