"""Recruitee (https://docs.recruitee.com/reference), Bearer API token auth.

Endpoints are account-scoped under `/c/{company_id}/...` in Recruitee's own
docs; we call the relative paths and trust Nango's base-URL templating
resolves the company-specific host the same way it does for Workable's
subdomain. Pagination is offset-based (`limit`/`offset`), with no explicit
"has more" flag -- we stop once a page comes back smaller than the limit.
"""

from typing import Any, Iterator

from .base import NormalizedCandidate, NormalizedJob
from ..nango_client import proxy_get

PROVIDER_CONFIG_KEY = "recruitee"

_PAGE_SIZE = 100

_STATUS_MAP = {
    "published": "OPEN",
    "draft": "DRAFT",
    "closed": "CLOSED",
    "archived": "CLOSED",
}


def _paginate(connection_id: str, endpoint: str, list_key: str) -> Iterator[dict[str, Any]]:
    offset = 0
    while True:
        data = proxy_get(
            connection_id=connection_id,
            provider_config_key=PROVIDER_CONFIG_KEY,
            endpoint=endpoint,
            params={"limit": _PAGE_SIZE, "offset": offset},
        ).json()
        items = data.get(list_key) or []
        if not items:
            return
        yield from items
        if len(items) < _PAGE_SIZE:
            return
        offset += _PAGE_SIZE


def fetch_candidates(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/candidates", "candidates")


def fetch_jobs(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/offers", "offers")


def normalize_candidate(raw: dict[str, Any]) -> NormalizedCandidate:
    name = raw.get("name") or ""
    first_name, _, last_name = name.partition(" ")
    emails = raw.get("emails") or []
    phones = raw.get("phones") or []
    return NormalizedCandidate(
        external_id=str(raw.get("id")),
        first_name=first_name,
        last_name=last_name,
        email=emails[0] if emails else "",
        phone=phones[0] if phones else "",
        resume_url="",  # CVs are a separate nested resource in Recruitee, not on this object -- known gap
        stage="",
        source=(raw.get("referral") or {}).get("name", "") if isinstance(raw.get("referral"), dict) else "",
        tags=raw.get("tags") or [],
        ats_job_external_ids=[],
        ats_created_at=raw.get("created_at"),
        location=", ".join(filter(None, [raw.get("city"), raw.get("country")])),
        raw=raw,
    )


def normalize_job(raw: dict[str, Any]) -> NormalizedJob:
    department = raw.get("department")
    return NormalizedJob(
        external_id=str(raw.get("id")),
        title=raw.get("title") or "",
        description=raw.get("description") or "",
        location=", ".join(filter(None, [raw.get("city"), raw.get("country")])),
        department=department.get("name", "") if isinstance(department, dict) else (department or ""),
        employment_type=raw.get("employment_type_code") or "",
        status=_STATUS_MAP.get(raw.get("state"), "UNKNOWN"),
        salary_min=None,
        salary_max=None,
        salary_currency="",
        ats_created_at=raw.get("created_at"),
        raw=raw,
    )
