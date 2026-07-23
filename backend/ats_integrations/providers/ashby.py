"""Ashby (https://developers.ashbyhq.com/), Basic Auth with API key as username.

Ashby's list endpoints are POST/RPC-style, not REST GET -- `/candidate.list`
and `/job.list`, both cursor-paginated via `nextCursor` (request) /
`moreDataAvailable` + `nextCursor` (response).
See https://developers.ashbyhq.com/docs/pagination-and-incremental-sync
"""

from typing import Any, Iterator

from .base import NormalizedCandidate, NormalizedJob
from ..nango_client import proxy_post

PROVIDER_CONFIG_KEY = "ashby"

_STATUS_MAP = {
    "Open": "OPEN",
    "Closed": "CLOSED",
    "Draft": "DRAFT",
    "Archived": "CLOSED",
}


def _paginate(connection_id: str, endpoint: str) -> Iterator[dict[str, Any]]:
    cursor: str | None = None
    while True:
        body: dict[str, Any] = {"limit": 100}
        if cursor:
            body["cursor"] = cursor
        data = proxy_post(
            connection_id=connection_id, provider_config_key=PROVIDER_CONFIG_KEY, endpoint=endpoint, json=body
        ).json()
        items = data.get("results") or []
        if not items:
            return
        yield from items
        if not data.get("moreDataAvailable"):
            return
        cursor = data.get("nextCursor")
        if not cursor:
            return


def fetch_candidates(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/candidate.list")


def fetch_jobs(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/job.list")


def normalize_candidate(raw: dict[str, Any]) -> NormalizedCandidate:
    emails = raw.get("primaryEmailAddress") or {}
    phones = raw.get("primaryPhoneNumber") or {}
    social_links = raw.get("socialLinks") or []
    linkedin = next(
        (s.get("url", "") for s in social_links if "linkedin" in (s.get("type") or "").lower()), ""
    )
    portfolio_urls = [s.get("url", "") for s in social_links if s.get("url") and s.get("url") != linkedin]
    return NormalizedCandidate(
        external_id=str(raw.get("id")),
        first_name=raw.get("name", "").split(" ", 1)[0] if raw.get("name") else "",
        last_name=raw.get("name", "").split(" ", 1)[-1] if raw.get("name") and " " in raw.get("name", "") else "",
        email=emails.get("value", "") if isinstance(emails, dict) else "",
        phone=phones.get("value", "") if isinstance(phones, dict) else "",
        # Resume is a separate "fileHandle" resource -- the actual downloadable URL requires a
        # second RPC call (file.info) per candidate keyed off resumeFileHandle.handle. Not fetched
        # here to avoid doubling API calls across a whole sync; known gap, see raw_data.resumeFileHandle.
        resume_url="",
        stage="",
        source=(raw.get("source") or {}).get("title", "") if isinstance(raw.get("source"), dict) else "",
        tags=raw.get("tags") or [],
        ats_job_external_ids=[],
        ats_created_at=raw.get("createdAt"),
        linkedin_url=linkedin,
        portfolio_urls=portfolio_urls,
        raw=raw,
    )


def normalize_job(raw: dict[str, Any]) -> NormalizedJob:
    location = raw.get("location")
    department = raw.get("department")
    return NormalizedJob(
        external_id=str(raw.get("id")),
        title=raw.get("title") or "",
        description="",  # not included on job.list -- would need a job.info call per job
        location=location.get("name", "") if isinstance(location, dict) else (location or ""),
        department=department.get("name", "") if isinstance(department, dict) else (department or ""),
        employment_type=raw.get("employmentType") or "",
        status=_STATUS_MAP.get(raw.get("status"), "UNKNOWN"),
        salary_min=None,
        salary_max=None,
        salary_currency="",
        ats_created_at=raw.get("createdAt"),
        raw=raw,
    )
