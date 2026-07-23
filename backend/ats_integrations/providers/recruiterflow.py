"""Recruiterflow (https://recruiterflow.com/api), API key auth.

All endpoints live under an unversioned `/api/external/` prefix. Pagination
is confirmed page-based (`current_page` starting at 1, `items_per_page` capped
at 100); the exact list endpoint paths and response wrapper key are inferred
from Nango's sync descriptions ("syncs all candidates" / "syncs all jobs"),
not a verified spec -- check `raw_data` on the first real sync.
"""

from typing import Any, Iterator

from .base import NormalizedCandidate, NormalizedJob
from ..nango_client import proxy_get

PROVIDER_CONFIG_KEY = "recruiterflow"

_PAGE_SIZE = 100


def _paginate(connection_id: str, endpoint: str, list_key: str) -> Iterator[dict[str, Any]]:
    page = 1
    while True:
        data = proxy_get(
            connection_id=connection_id,
            provider_config_key=PROVIDER_CONFIG_KEY,
            endpoint=endpoint,
            params={"current_page": page, "items_per_page": _PAGE_SIZE},
        ).json()
        items = data.get(list_key) or data.get("data") or data.get("results") or []
        if not items:
            return
        yield from items
        if len(items) < _PAGE_SIZE:
            return
        page += 1


def fetch_candidates(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/api/external/candidate/list", "candidates")


def fetch_jobs(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/api/external/job/list", "jobs")


def normalize_candidate(raw: dict[str, Any]) -> NormalizedCandidate:
    return NormalizedCandidate(
        external_id=str(raw.get("id")),
        first_name=raw.get("first_name") or "",
        last_name=raw.get("last_name") or "",
        email=raw.get("email") or "",
        phone=raw.get("phone") or "",
        resume_url=raw.get("resume_url") or "",
        stage=raw.get("stage") or raw.get("status") or "",
        source=raw.get("source") or "",
        tags=raw.get("tags") or [],
        ats_job_external_ids=[str(j) for j in (raw.get("job_ids") or [])] if raw.get("job_ids") else [],
        ats_created_at=raw.get("created_at"),
        # Field names below are unverified (same caveat as the rest of this module) -- check
        # raw_data on the first real sync and adjust if these come back blank.
        location=raw.get("location") or "",
        linkedin_url=raw.get("linkedin_url") or "",
        current_title=raw.get("current_title") or "",
        current_company=raw.get("current_company") or "",
        raw=raw,
    )


def normalize_job(raw: dict[str, Any]) -> NormalizedJob:
    return NormalizedJob(
        external_id=str(raw.get("id")),
        title=raw.get("title") or raw.get("name") or "",
        description=raw.get("description") or "",
        location=raw.get("location") or "",
        department=raw.get("department") or "",
        employment_type=raw.get("employment_type") or "",
        status="OPEN" if (raw.get("status") or "").lower() in ("open", "active") else "UNKNOWN",
        salary_min=None,
        salary_max=None,
        salary_currency="",
        ats_created_at=raw.get("created_at"),
        raw=raw,
    )
