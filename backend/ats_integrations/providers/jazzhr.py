"""JazzHR (http://www.resumatorapi.com/v1/), API key auth (query param).

Unusual pagination: JazzHR appends the page number to the URL *path*
(`/applicants/page/2`) rather than using a query parameter, and caps every
page at 100 results with no explicit "has more" flag -- we stop once a page
comes back with fewer than 100 items.
"""

from typing import Any, Iterator

from .base import NormalizedCandidate, NormalizedJob
from ..nango_client import proxy_get

PROVIDER_CONFIG_KEY = "jazzhr"

_PAGE_SIZE = 100

_STATUS_MAP = {
    "open": "OPEN",
    "closed": "CLOSED",
    "on hold": "DRAFT",
    "filled": "CLOSED",
    "canceled": "CLOSED",
    "draft": "DRAFT",
}


def _paginate(connection_id: str, base_endpoint: str) -> Iterator[dict[str, Any]]:
    page = 1
    while True:
        endpoint = base_endpoint if page == 1 else f"{base_endpoint}/page/{page}"
        items = proxy_get(connection_id=connection_id, provider_config_key=PROVIDER_CONFIG_KEY, endpoint=endpoint).json()
        if not isinstance(items, list) or not items:
            return
        yield from items
        if len(items) < _PAGE_SIZE:
            return
        page += 1


def fetch_candidates(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/applicants")


def fetch_jobs(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/jobs")


def normalize_candidate(raw: dict[str, Any]) -> NormalizedCandidate:
    return NormalizedCandidate(
        external_id=str(raw.get("id")),
        first_name=raw.get("first_name") or "",
        last_name=raw.get("last_name") or "",
        email=raw.get("email") or "",
        phone=raw.get("phone") or "",
        resume_url=raw.get("resume") or "",
        stage=raw.get("status") or "",
        source=raw.get("source") or "",
        tags=[],
        ats_job_external_ids=[str(raw["job_id"])] if raw.get("job_id") else [],
        ats_created_at=raw.get("date_applied") or raw.get("apply_date"),
        location=", ".join(filter(None, [raw.get("city"), raw.get("state")])),
        cover_letter=raw.get("cover_letter") or "",
        raw=raw,
    )


def normalize_job(raw: dict[str, Any]) -> NormalizedJob:
    location = ", ".join(filter(None, [raw.get("city"), raw.get("state"), raw.get("country")]))
    return NormalizedJob(
        external_id=str(raw.get("id")),
        title=raw.get("title") or "",
        description=raw.get("description") or "",
        location=location,
        department=raw.get("department") or "",
        employment_type=raw.get("type") or "",
        status=_STATUS_MAP.get((raw.get("status") or "").lower(), "UNKNOWN"),
        salary_min=None,
        salary_max=None,
        salary_currency="",
        ats_created_at=raw.get("open_date"),
        raw=raw,
    )
