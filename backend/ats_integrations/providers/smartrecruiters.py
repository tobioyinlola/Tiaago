"""SmartRecruiters (https://developers.smartrecruiters.com/docs/).

Auth: API key, sent by Nango as the `X-SmartToken` header (Nango's
pre-built "smartrecruiters" integration uses API_KEY auth mode).

Pagination: cursor-based via `pageId` (request param) / `nextPageId`
(response field) -- the current recommended approach for both the Job API
and Candidate API. See https://developers.smartrecruiters.com/docs/pagination
"""

from typing import Any, Iterator

from .base import NormalizedCandidate, NormalizedJob
from ..nango_client import proxy_get

PROVIDER_CONFIG_KEY = "smartrecruiters-api-key"

_STATUS_MAP = {
    "SOURCING": "OPEN",
    "INTERVIEW": "OPEN",
    "OFFER": "OPEN",
    "FILLED": "CLOSED",
    "CANCELLED": "CLOSED",
    "ON_HOLD": "DRAFT",
    "CREATED": "DRAFT",
}


def _paginate(connection_id: str, endpoint: str) -> Iterator[dict[str, Any]]:
    page_id: str | None = None
    while True:
        params: dict[str, Any] = {"limit": 100}
        if page_id:
            params["pageId"] = page_id
        data = proxy_get(
            connection_id=connection_id, provider_config_key=PROVIDER_CONFIG_KEY, endpoint=endpoint, params=params
        ).json()
        items = data.get("content") or []
        if not items:
            return
        yield from items
        page_id = data.get("nextPageId")
        if not page_id:
            return


def fetch_candidates(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/candidates")


def fetch_jobs(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/jobs")


def normalize_candidate(raw: dict[str, Any]) -> NormalizedCandidate:
    source = raw.get("source")
    location = raw.get("location") or {}
    web = raw.get("web") or {}  # website/linkedin/facebook/twitter, when present on the summary payload
    portfolio_urls = [v for k, v in web.items() if k != "linkedin" and v]
    return NormalizedCandidate(
        external_id=str(raw.get("id")),
        first_name=raw.get("firstName") or "",
        last_name=raw.get("lastName") or "",
        email=raw.get("email") or "",
        phone=raw.get("phone") or "",
        # Resume/CV isn't present on the list payload -- SmartRecruiters exposes it as a binary
        # attachment download (GET /candidates/{id}/attachments/{attachmentId}) that requires
        # authenticated per-request headers, not a stable public URL, so it can't be stored here
        # as a plain link. Known gap: see raw_data.attachments (if present) for the attachment id.
        resume_url="",
        stage="",
        source=source.get("name", "") if isinstance(source, dict) else "",
        tags=raw.get("tags") or [],
        ats_job_external_ids=[],
        ats_created_at=raw.get("createdOn"),
        location=", ".join(filter(None, [location.get("city"), location.get("region"), location.get("country")])),
        linkedin_url=web.get("linkedin", "") if isinstance(web, dict) else "",
        portfolio_urls=portfolio_urls,
        raw=raw,
    )


def normalize_job(raw: dict[str, Any]) -> NormalizedJob:
    location = raw.get("location") or {}
    department = raw.get("department") or {}
    compensation = raw.get("compensation") or {}
    employment_type = raw.get("typeOfEmployment")
    return NormalizedJob(
        external_id=str(raw.get("id")),
        title=raw.get("title") or "",
        description="",  # nested under jobAd.sections.* -- shape not confirmed without a live account
        location=", ".join(filter(None, [location.get("city"), location.get("region"), location.get("country")])),
        department=department.get("label", "") if isinstance(department, dict) else "",
        employment_type=employment_type.get("label", "") if isinstance(employment_type, dict) else "",
        status=_STATUS_MAP.get(raw.get("status"), "UNKNOWN"),
        salary_min=compensation.get("min"),
        salary_max=compensation.get("max"),
        salary_currency=compensation.get("currency") or "",
        ats_created_at=raw.get("createdOn"),
        raw=raw,
    )
