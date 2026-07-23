"""BambooHR Applicant Tracking System, Basic Auth (API key as username).

Uses Nango's "BambooHR (Basic Auth)" pre-built integration -- the connecting
recruiter enters their BambooHR API key and Subdomain in Nango's Connect UI;
Nango templates the base URL from the subdomain the same way it does for
Workable.

LOWER CONFIDENCE THAN MOST OTHER PROVIDERS HERE: BambooHR's Applicant
Tracking API is far less commonly integrated against than Greenhouse/Lever/
Workable, and its public reference docs weren't reachable while building
this module. BambooHR's own docs explicitly warn that the ATS schema "can
vary across accounts" -- ATS field configuration is customizable per
BambooHR account, so don't assume every field below is present. Field names
and the pagination scheme (limit/cursor) are inferred from secondary sources,
not a verified spec. Check `raw_data` on the first real sync and adjust
field names here if anything looks off.

Resume/cover letter come back as file IDs, not direct URLs -- fetching the
actual file requires a separate authenticated per-file download call
(`/v1/applicant_tracking/applications/{id}/files/{fileId}`), which isn't
done here to avoid an extra API call per candidate on every sync (same
tradeoff already made for SmartRecruiters/Ashby/Zoho Recruit). Known gap:
see raw_data for the file id if you need to fetch it separately.
"""

from typing import Any, Iterator

from .base import NormalizedCandidate, NormalizedJob
from ..nango_client import proxy_get

PROVIDER_CONFIG_KEY = "bamboohr-basic"

_STATUS_MAP = {
    "open": "OPEN",
    "filled": "CLOSED",
    "closed": "CLOSED",
    "on hold": "DRAFT",
    "draft": "DRAFT",
    "canceled": "CLOSED",
}


def _paginate(connection_id: str, endpoint: str) -> Iterator[dict[str, Any]]:
    cursor: str | None = None
    while True:
        params: dict[str, Any] = {"limit": 100}
        if cursor:
            params["cursor"] = cursor
        data = proxy_get(
            connection_id=connection_id, provider_config_key=PROVIDER_CONFIG_KEY, endpoint=endpoint, params=params
        ).json()
        items = data if isinstance(data, list) else (data.get("result") or data.get("applications") or data.get("jobs") or data.get("data") or [])
        if not items:
            return
        yield from items
        cursor = data.get("next_cursor") or data.get("nextCursor") if isinstance(data, dict) else None
        if not cursor:
            return


def fetch_candidates(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/v1/applicant_tracking/applications")


def fetch_jobs(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/v1/applicant_tracking/jobs")


def normalize_candidate(raw: dict[str, Any]) -> NormalizedCandidate:
    applicant = raw.get("applicant") or raw
    status = raw.get("status")
    job = raw.get("job") or {}
    return NormalizedCandidate(
        external_id=str(raw.get("id") or raw.get("applicationId")),
        first_name=applicant.get("firstName") or applicant.get("first_name") or "",
        last_name=applicant.get("lastName") or applicant.get("last_name") or "",
        email=applicant.get("email") or "",
        phone=applicant.get("phoneNumber") or applicant.get("phone") or "",
        resume_url="",  # comes back as a file id, not a URL -- see module docstring
        stage=(status.get("label") if isinstance(status, dict) else status) or "",
        source=raw.get("source") or "",
        tags=[],
        ats_job_external_ids=[str(job["id"])] if isinstance(job, dict) and job.get("id") else [],
        ats_created_at=raw.get("appliedDate") or raw.get("applied_date") or raw.get("createdDate"),
        location=", ".join(filter(None, [applicant.get("city"), applicant.get("state"), applicant.get("country")])),
        raw=raw,
    )


def normalize_job(raw: dict[str, Any]) -> NormalizedJob:
    department = raw.get("department")
    location = raw.get("location")
    status = raw.get("status")
    return NormalizedJob(
        external_id=str(raw.get("id")),
        title=raw.get("title") or raw.get("jobTitle") or "",
        description=raw.get("description") or "",
        location=location.get("name", "") if isinstance(location, dict) else (location or ""),
        department=department.get("name", "") if isinstance(department, dict) else (department or ""),
        employment_type=raw.get("employmentType") or "",
        status=_STATUS_MAP.get(((status.get("label") if isinstance(status, dict) else status) or "").lower(), "UNKNOWN"),
        salary_min=None,
        salary_max=None,
        salary_currency="",
        ats_created_at=raw.get("postedDate") or raw.get("createdDate"),
        raw=raw,
    )
