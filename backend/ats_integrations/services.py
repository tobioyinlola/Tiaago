"""Writes NormalizedCandidate/NormalizedJob dicts (see providers.base) into
our own DB, upserting on (company, provider, external_id) so re-syncing an
already-connected ATS never creates duplicates."""

from datetime import datetime

from django.utils.dateparse import parse_datetime
from django.utils.timezone import is_naive, make_aware

from create_user.models import Company

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
