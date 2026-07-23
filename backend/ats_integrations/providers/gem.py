"""Gem (https://nango.dev/docs/integrations/all/gem), API key auth.

Nango's pre-built "gem" integration injects both required headers
(`x-api-key` and `x-application-secret`) once configured with an API key +
application secret -- this module doesn't need to add them manually.

LOWER CONFIDENCE THAN THE OTHER PROVIDERS: Gem's public API reference isn't
fully open, so the exact endpoint paths and pagination cursor field names
below are our best inference from Nango's sync descriptions ("syncs all
candidates" / "syncs all jobs"), not a verified spec. Check `raw_data` on
the first real sync and adjust field names here if anything looks off.
"""

from typing import Any, Iterator

from .base import NormalizedCandidate, NormalizedJob, extract_query_param
from ..nango_client import proxy_get

PROVIDER_CONFIG_KEY = "gem"


def _paginate(connection_id: str, endpoint: str, list_key: str) -> Iterator[dict[str, Any]]:
    cursor: str | None = None
    while True:
        params: dict[str, Any] = {"limit": 100}
        if cursor:
            params["cursor"] = cursor
        data = proxy_get(
            connection_id=connection_id, provider_config_key=PROVIDER_CONFIG_KEY, endpoint=endpoint, params=params
        ).json()
        items = data.get(list_key) or data.get("data") or []
        if not items:
            return
        yield from items
        next_cursor = data.get("next_cursor") or extract_query_param(data.get("next") or "", "cursor")
        if not next_cursor:
            return
        cursor = next_cursor


def fetch_candidates(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/v0/candidates", "candidates")


def fetch_jobs(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/v0/jobs", "jobs")


def normalize_candidate(raw: dict[str, Any]) -> NormalizedCandidate:
    emails = raw.get("emails") or []
    return NormalizedCandidate(
        external_id=str(raw.get("id")),
        first_name=raw.get("first_name") or "",
        last_name=raw.get("last_name") or "",
        email=raw.get("email") or (emails[0] if emails else ""),
        phone=raw.get("phone") or "",
        resume_url=raw.get("resume_url") or "",
        stage=raw.get("stage") or "",
        source=raw.get("source") or "",
        tags=raw.get("tags") or [],
        ats_job_external_ids=[str(j) for j in (raw.get("job_ids") or [])],
        ats_created_at=raw.get("created_at"),
        location=raw.get("location") or "",
        linkedin_url=raw.get("linkedin_url") or "",
        current_title=raw.get("title") or "",
        current_company=raw.get("company") or "",
        raw=raw,
    )


def normalize_job(raw: dict[str, Any]) -> NormalizedJob:
    return NormalizedJob(
        external_id=str(raw.get("id")),
        title=raw.get("name") or raw.get("title") or "",
        description=raw.get("description") or "",
        location=raw.get("location") or "",
        department=raw.get("department") or "",
        employment_type=raw.get("employment_type") or "",
        status="OPEN" if raw.get("status") in ("open", "OPEN", True) else "UNKNOWN",
        salary_min=None,
        salary_max=None,
        salary_currency="",
        ats_created_at=raw.get("created_at"),
        raw=raw,
    )
