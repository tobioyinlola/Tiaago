"""Teamtailor (https://docs.teamtailor.com/), API key via Authorization header.

Follows the JSON:API spec: list responses are `{"data": [...], "links": {}}`,
each record's real fields live under `data[i]["attributes"]` in kebab-case
(e.g. "first-name", not "first_name"). Pagination is `page[number]`/
`page[size]`; we stop once a page comes back empty.

Every Teamtailor call requires a static `X-Api-Version` header (a dated
version string) alongside the credential Nango injects -- TEAMTAILOR_API_VERSION
below is a reasonably recent guess; if Teamtailor rejects requests with a
version-mismatch error, update this constant to whatever version your
Teamtailor account's API docs page shows as current.
"""

from typing import Any, Iterator

from .base import NormalizedCandidate, NormalizedJob
from ..nango_client import proxy_get

PROVIDER_CONFIG_KEY = "teamtailor"

TEAMTAILOR_API_VERSION = "20240404"

_STATUS_MAP = {
    "open": "OPEN",
    "unlisted": "OPEN",
    "closed": "CLOSED",
    "draft": "DRAFT",
    "archived": "CLOSED",
}


def _paginate(connection_id: str, endpoint: str) -> Iterator[dict[str, Any]]:
    page = 1
    while True:
        data = proxy_get(
            connection_id=connection_id,
            provider_config_key=PROVIDER_CONFIG_KEY,
            endpoint=endpoint,
            params={"page[number]": page, "page[size]": 30},
            extra_headers={"X-Api-Version": TEAMTAILOR_API_VERSION},
        ).json()
        items = data.get("data") or []
        if not items:
            return
        yield from items
        if not (data.get("links") or {}).get("next"):
            return
        page += 1


def fetch_candidates(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/v1/candidates")


def fetch_jobs(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/v1/jobs")


def normalize_candidate(raw: dict[str, Any]) -> NormalizedCandidate:
    attrs = raw.get("attributes") or {}
    return NormalizedCandidate(
        external_id=str(raw.get("id")),
        first_name=attrs.get("first-name") or "",
        last_name=attrs.get("last-name") or "",
        email=attrs.get("email") or "",
        phone=attrs.get("phone") or "",
        resume_url=attrs.get("resume") or "",
        stage="",
        source=attrs.get("original-resume-source") or "",
        tags=attrs.get("tags") or [],
        ats_job_external_ids=[],
        ats_created_at=attrs.get("created-at"),
        cover_letter=attrs.get("pitch") or "",  # Teamtailor calls a candidate's personal statement a "pitch"
        raw=raw,
    )


def normalize_job(raw: dict[str, Any]) -> NormalizedJob:
    attrs = raw.get("attributes") or {}
    return NormalizedJob(
        external_id=str(raw.get("id")),
        title=attrs.get("title") or "",
        description=attrs.get("body") or "",
        location="",  # locations are a separate related resource, not a plain attribute
        department="",  # same -- department is a relationship, would need an included/sideload fetch
        employment_type=attrs.get("employment-type") or "",
        status=_STATUS_MAP.get(attrs.get("status"), "UNKNOWN"),
        salary_min=None,
        salary_max=None,
        salary_currency="",
        ats_created_at=attrs.get("created-at"),
        raw=raw,
    )
