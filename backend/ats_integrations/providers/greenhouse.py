"""Greenhouse -- Harvest API v1 (https://developers.greenhouse.io/harvest.html).

IMPORTANT: this deliberately does NOT use either of Nango's Greenhouse
templates:
  - "Greenhouse (OAuth)" wraps the Partner/Sourcing API, whose "get
    candidates" endpoint (`/v1/partner/candidates`) requires you to already
    know specific candidate IDs -- built for job-board partners doing status
    lookups, not bulk ATS export.
  - "Greenhouse (Job Board API)" is read-only and jobs-only -- it has no
    candidate data at all (it's the public feed behind a company's careers
    page).

For "pull every candidate and open job," Greenhouse's own answer is the
Harvest API, authenticated with a Basic-Auth API key (key as username, blank
password). Configure it in Nango via the generic "Private API (Basic Auth)"
template: Unique Key must be exactly "greenhouse", with the integration's
Base URL overridden to https://harvest.greenhouse.io. The connecting
recruiter then enters the Harvest API key as the Username (Password blank).

Pagination: Harvest uses a `Link` response header (`rel="next"`), the same
style as GitHub's API, plus a `per_page` param (max 500).
"""

import re
from typing import Any, Iterator

from .base import NormalizedCandidate, NormalizedJob
from ..nango_client import proxy_get

PROVIDER_CONFIG_KEY = "greenhouse"

_STATUS_MAP = {
    "open": "OPEN",
    "closed": "CLOSED",
    "draft": "DRAFT",
}

_LINK_NEXT_RE = re.compile(r'<([^>]+)>;\s*rel="next"')


def _next_page_endpoint(link_header: str | None) -> str | None:
    """Harvest's Link header gives a full URL; we only need the path +
    query string since proxy_get always talks to Nango's own /proxy prefix
    with a fixed host."""
    if not link_header:
        return None
    match = _LINK_NEXT_RE.search(link_header)
    if not match:
        return None
    full_url = match.group(1)
    # Strip the scheme+host (https://harvest.greenhouse.io) -- proxy_get
    # only wants the path+query.
    return re.sub(r"^https?://[^/]+", "", full_url)


def _paginate(connection_id: str, endpoint: str) -> Iterator[dict[str, Any]]:
    params: dict[str, Any] | None = {"per_page": 500}
    while endpoint:
        resp = proxy_get(
            connection_id=connection_id, provider_config_key=PROVIDER_CONFIG_KEY, endpoint=endpoint, params=params
        )
        items = resp.json() or []
        if not isinstance(items, list):
            return
        yield from items
        next_endpoint = _next_page_endpoint(resp.headers.get("Link"))
        endpoint = next_endpoint
        params = None  # the next URL from the Link header already has its own query string baked in


def fetch_candidates(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/v1/candidates")


def fetch_jobs(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/v1/jobs")


def normalize_candidate(raw: dict[str, Any]) -> NormalizedCandidate:
    emails = raw.get("email_addresses") or []
    phones = raw.get("phone_numbers") or []
    attachments = raw.get("attachments") or []
    resume = next((a for a in attachments if a.get("type") == "resume"), None)
    applications = raw.get("applications") or []
    job_ids = [str(job["id"]) for app in applications for job in (app.get("jobs") or []) if job.get("id")]
    stage = (applications[0].get("current_stage") or {}).get("name", "") if applications else ""
    addresses = raw.get("addresses") or []
    websites = raw.get("website_addresses") or []
    linkedin = next((w.get("value", "") for w in websites if "linkedin" in (w.get("type") or "").lower()), "")
    portfolio_urls = [w.get("value", "") for w in websites if w.get("value") and w.get("value") != linkedin]
    educations = [
        {
            "school": (e.get("school_name") or ""),
            "degree": (e.get("degree") or ""),
            "field": (e.get("discipline") or ""),
            "start_date": e.get("start_date"),
            "end_date": e.get("end_date"),
        }
        for e in (raw.get("educations") or [])
    ]
    employments = [
        {
            "company": (e.get("company_name") or ""),
            "title": (e.get("title") or ""),
            "start_date": e.get("start_date"),
            "end_date": e.get("end_date"),
        }
        for e in (raw.get("employments") or [])
    ]
    application_answers = [
        {"question": a.get("question", ""), "answer": a.get("answer", "")}
        for a in (applications[0].get("answers") or [])
    ] if applications else []
    return NormalizedCandidate(
        external_id=str(raw.get("id")),
        first_name=raw.get("first_name") or "",
        last_name=raw.get("last_name") or "",
        email=emails[0]["value"] if emails else "",
        phone=phones[0]["value"] if phones else "",
        resume_url=(resume or {}).get("url", ""),
        stage=stage,
        source="",
        tags=raw.get("tags") or [],
        ats_job_external_ids=job_ids,
        ats_created_at=raw.get("created_at"),
        location=addresses[0].get("value", "") if addresses else "",
        linkedin_url=linkedin,
        portfolio_urls=portfolio_urls,
        current_title=raw.get("title") or "",
        current_company=raw.get("company") or "",
        cover_letter="",  # not exposed as a discrete field on the Harvest candidate object
        education=educations,
        work_experience=employments,
        application_answers=application_answers,
        raw=raw,
    )


def normalize_job(raw: dict[str, Any]) -> NormalizedJob:
    departments = raw.get("departments") or []
    offices = raw.get("offices") or []
    return NormalizedJob(
        external_id=str(raw.get("id")),
        title=raw.get("name") or "",
        description=raw.get("notes") or "",
        location=(offices[0].get("location") or {}).get("name", "") if offices else "",
        department=departments[0].get("name", "") if departments else "",
        employment_type="",
        status=_STATUS_MAP.get(raw.get("status"), "UNKNOWN"),
        salary_min=None,
        salary_max=None,
        salary_currency="",
        ats_created_at=raw.get("created_at"),
        raw=raw,
    )
