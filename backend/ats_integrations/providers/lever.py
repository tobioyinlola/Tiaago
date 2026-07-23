"""Lever (https://nango.dev/docs/integrations/all/lever-basic), Basic Auth.

Uses Nango's "Lever (Basic Auth)" pre-built integration -- an API key
pasted straight into Nango's Connect UI, no OAuth app registration needed.
The REST endpoints below are identical to Lever's OAuth integration; only
the credential injection differs, which Nango's proxy handles either way.

Pagination: /v1/opportunities (candidates) is cursor-based via `next` +
`hasNext`. /v1/postings (jobs) is NOT paginated by Lever's API -- their own
docs warn "it is possible that not all postings are returned" for accounts
with a very large number of postings. We fetch it as a single page; there's
no cursor to follow even if it were incomplete.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Iterator

from .base import NormalizedCandidate, NormalizedJob
from ..nango_client import proxy_get

logger = logging.getLogger(__name__)

PROVIDER_CONFIG_KEY = "lever-basic"

_STATUS_MAP = {
    "published": "OPEN",
    "internal": "OPEN",
    "closed": "CLOSED",
    "draft": "DRAFT",
}


def _epoch_ms_to_iso(value: Any) -> str | None:
    if not value:
        return None
    try:
        return datetime.fromtimestamp(int(value) / 1000, tz=timezone.utc).isoformat()
    except (TypeError, ValueError):
        return None


def _fetch_resume_url(connection_id: str, opportunity_id: str) -> str:
    """GET /v1/opportunities/{id}/resumes -- resumes are a nested resource
    in Lever, not present on the opportunity itself. Best-effort: a failure
    here (e.g. candidate has no resume) must never abort the whole sync."""
    try:
        data = proxy_get(
            connection_id=connection_id,
            provider_config_key=PROVIDER_CONFIG_KEY,
            endpoint=f"/v1/opportunities/{opportunity_id}/resumes",
        ).json()
        resumes = data.get("data") or []
        if not resumes:
            return ""
        return (resumes[0].get("file") or {}).get("downloadUrl", "")
    except Exception:
        logger.warning("Lever: failed to fetch resume for opportunity %s", opportunity_id, exc_info=True)
        return ""


def fetch_candidates(connection_id: str) -> Iterator[dict[str, Any]]:
    offset: str | None = None
    while True:
        params: dict[str, Any] = {"limit": 100}
        if offset:
            params["offset"] = offset
        data = proxy_get(
            connection_id=connection_id, provider_config_key=PROVIDER_CONFIG_KEY, endpoint="/v1/opportunities", params=params
        ).json()
        items = data.get("data") or []
        if not items:
            return
        for item in items:
            opportunity_id = item.get("id")
            if opportunity_id:
                item["_resume_url"] = _fetch_resume_url(connection_id, opportunity_id)
            yield item
        if not data.get("hasNext"):
            return
        offset = data.get("next")
        if not offset:
            return


def fetch_jobs(connection_id: str) -> Iterator[dict[str, Any]]:
    # Not paginated by Lever -- see module docstring.
    data = proxy_get(connection_id=connection_id, provider_config_key=PROVIDER_CONFIG_KEY, endpoint="/v1/postings").json()
    yield from data.get("data") or []


def normalize_candidate(raw: dict[str, Any]) -> NormalizedCandidate:
    name = raw.get("name") or ""
    first_name, _, last_name = name.partition(" ")
    emails = raw.get("emails") or []
    phones = raw.get("phones") or []
    links = raw.get("links") or []
    linkedin = next((link for link in links if "linkedin.com" in link.lower()), "")
    portfolio_urls = [link for link in links if link != linkedin]
    return NormalizedCandidate(
        external_id=str(raw.get("id")),
        first_name=first_name,
        last_name=last_name,
        email=emails[0] if emails else "",
        phone=(phones[0] or {}).get("value", "") if phones else "",
        resume_url=raw.get("_resume_url") or "",
        stage=raw.get("stage") or "",
        source=", ".join(raw.get("sources") or []),
        tags=raw.get("tags") or [],
        ats_job_external_ids=raw.get("applications") or [],
        ats_created_at=_epoch_ms_to_iso(raw.get("createdAt")),
        location=raw.get("location") or "",
        linkedin_url=linkedin,
        portfolio_urls=portfolio_urls,
        current_title=raw.get("headline") or "",  # Lever's "headline" is usually free-text "Title at Company"
        cover_letter="",
        raw=raw,
    )


def normalize_job(raw: dict[str, Any]) -> NormalizedJob:
    categories = raw.get("categories") or {}
    content = raw.get("content") or {}
    return NormalizedJob(
        external_id=str(raw.get("id")),
        title=raw.get("text") or "",
        description=content.get("description") or content.get("descriptionHtml") or "",
        location=categories.get("location") or "",
        department=categories.get("department") or categories.get("team") or "",
        employment_type=categories.get("commitment") or "",
        status=_STATUS_MAP.get(raw.get("state"), "UNKNOWN"),
        salary_min=None,
        salary_max=None,
        salary_currency="",
        ats_created_at=_epoch_ms_to_iso(raw.get("createdAt")),
        raw=raw,
    )
