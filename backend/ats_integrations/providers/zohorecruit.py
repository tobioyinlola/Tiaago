"""Zoho Recruit (https://nango.dev/docs/integrations/all/zoho-recruit), OAuth-based.

Zoho uses datacenter-specific domains (.com/.eu/.in/.com.cn/.com.au) --
Nango's pre-built integration resolves the right one from the connection's
own configuration, so this module only ever needs the API path.

Pagination: page-number based. Every v2 GET response wraps results as
{"data": [...], "info": {"page", "per_page", "more_records"}} --
`more_records` (not a total count) tells us when to stop.
See https://www.zoho.com/recruit/developer-guide/apiv2/get-records.html
"""

from typing import Any, Iterator

from .base import NormalizedCandidate, NormalizedJob
from ..nango_client import proxy_get

PROVIDER_CONFIG_KEY = "zoho-recruit"

_STATUS_MAP = {
    "In-progress": "OPEN",
    "On Hold": "DRAFT",
    "Cancelled": "CLOSED",
    "Filled": "CLOSED",
    "Closed": "CLOSED",
}


def _paginate(connection_id: str, endpoint: str) -> Iterator[dict[str, Any]]:
    page = 1
    while True:
        data = proxy_get(
            connection_id=connection_id,
            provider_config_key=PROVIDER_CONFIG_KEY,
            endpoint=endpoint,
            params={"page": page, "per_page": 200},
        ).json()
        items = data.get("data") or []
        if not items:
            return
        yield from items
        if not (data.get("info") or {}).get("more_records"):
            return
        page += 1


def fetch_candidates(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/Candidates")


def fetch_jobs(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/JobOpenings")


def normalize_candidate(raw: dict[str, Any]) -> NormalizedCandidate:
    return NormalizedCandidate(
        external_id=str(raw.get("id")),
        first_name=raw.get("First_Name") or "",
        last_name=raw.get("Last_Name") or "",
        email=raw.get("Email") or "",
        phone=raw.get("Phone") or raw.get("Mobile") or "",
        resume_url="",  # resumes live under the Attachments related list, not this record -- known gap
        stage=raw.get("Candidate_Status") or "",
        source=raw.get("Source") or "",
        tags=raw.get("Tag") or [],
        ats_job_external_ids=[],
        ats_created_at=raw.get("Created_Time"),
        location=", ".join(filter(None, [raw.get("City"), raw.get("State"), raw.get("Country")])),
        current_title=raw.get("Current_Job_Title") or "",
        current_company=raw.get("Current_Employer") or "",
        raw=raw,
    )


def normalize_job(raw: dict[str, Any]) -> NormalizedJob:
    industry = raw.get("Industry")
    return NormalizedJob(
        external_id=str(raw.get("id")),
        title=raw.get("Posting_Title") or "",
        description=raw.get("Job_Description") or "",
        location=", ".join(filter(None, [raw.get("City"), raw.get("State"), raw.get("Country")])),
        department=industry.get("name", "") if isinstance(industry, dict) else (industry or ""),
        employment_type=raw.get("Employment_Type") or "",
        status=_STATUS_MAP.get(raw.get("Job_Opening_Status"), "UNKNOWN"),
        salary_min=None,
        salary_max=None,
        salary_currency="",
        ats_created_at=raw.get("Created_Time"),
        raw=raw,
    )
