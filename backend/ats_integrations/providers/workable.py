"""Workable (https://docs.nango.dev/integrations/all/workable).

Auth: API key + the company's Workable subdomain -- both are entered by the
recruiter in Nango's Connect UI; Nango templates the base URL from the
subdomain, so proxy calls here only need the path.

Pagination: cursor-based via `paging.next`, which Workable returns as a full
URL rather than a bare cursor -- we pull the `since_id` param back out of it
for the next request. See https://workable.readme.io/reference/job-candidates-index
"""

from typing import Any, Iterator

from .base import NormalizedCandidate, NormalizedJob, extract_query_param
from ..nango_client import proxy_get

PROVIDER_CONFIG_KEY = "workable"

_STATUS_MAP = {
    "published": "OPEN",
    "closed": "CLOSED",
    "draft": "DRAFT",
    "archived": "CLOSED",
}


def _paginate(connection_id: str, endpoint: str, list_key: str) -> Iterator[dict[str, Any]]:
    since_id: str | None = None
    while True:
        params: dict[str, Any] = {"limit": 100}
        if since_id:
            params["since_id"] = since_id
        data = proxy_get(
            connection_id=connection_id, provider_config_key=PROVIDER_CONFIG_KEY, endpoint=endpoint, params=params
        ).json()
        if not isinstance(data, dict):
            return
        items = data.get(list_key) or []
        if not items:
            return
        yield from items
        next_url = (data.get("paging") or {}).get("next") if isinstance(data.get("paging"), dict) else None
        since_id = extract_query_param(next_url, "since_id") if next_url else None
        if not since_id:
            return


def fetch_candidates(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/spi/v3/candidates", "candidates")


def fetch_jobs(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/spi/v3/jobs", "jobs")


def normalize_candidate(raw: dict[str, Any]) -> NormalizedCandidate:
    first_name = raw.get("firstname") or (raw.get("name") or "").split(" ", 1)[0]
    last_name = raw.get("lastname") or (raw.get("name") or "").split(" ", 1)[-1]
    job = raw.get("job") or {}
    resume = raw.get("resume") or {}
    address = raw.get("address") or {}
    source = raw.get("source")
    social_profiles = [p for p in (raw.get("social_profiles") or []) if isinstance(p, dict)]
    linkedin = next(
        (p.get("url", "") for p in social_profiles if "linkedin" in (p.get("type") or "").lower()), ""
    )
    portfolio_urls = [p.get("url", "") for p in social_profiles if p.get("url") and p.get("url") != linkedin]
    education_entries = raw.get("education_entries") or []
    experience_entries = raw.get("experience_entries") or []
    current_job = next((e for e in experience_entries if e.get("current")), experience_entries[0] if experience_entries else None)
    answers = [
        {"question": a.get("question", ""), "answer": a.get("body") or a.get("answer") or ""}
        for a in (raw.get("answers") or [])
    ]
    return NormalizedCandidate(
        external_id=str(raw.get("id")),
        first_name=first_name or "",
        last_name=last_name if last_name != first_name else "",
        email=raw.get("email") or "",
        phone=raw.get("phone") or "",
        resume_url=raw.get("resume_url") or resume.get("url") or "",
        stage=raw.get("stage") or "",
        source=source if isinstance(source, str) else (source or {}).get("name", "") if isinstance(source, dict) else "",
        tags=raw.get("tags") or [],
        ats_job_external_ids=[str(job["shortcode"])] if job.get("shortcode") else [],
        ats_created_at=raw.get("created_at"),
        location=address.get("location_str") or address.get("city") or "",
        linkedin_url=linkedin,
        portfolio_urls=portfolio_urls,
        current_title=(current_job or {}).get("title", ""),
        current_company=(current_job or {}).get("company", ""),
        cover_letter=raw.get("cover_letter") or "",
        education=[
            {
                "school": e.get("school", ""),
                "degree": e.get("degree", ""),
                "field": e.get("field_of_study", ""),
                "start_date": e.get("start_date"),
                "end_date": e.get("end_date"),
            }
            for e in education_entries
        ],
        work_experience=[
            {
                "company": e.get("company", ""),
                "title": e.get("title", ""),
                "start_date": e.get("start_date"),
                "end_date": e.get("end_date"),
            }
            for e in experience_entries
        ],
        application_answers=answers,
        raw=raw,
    )


def normalize_job(raw: dict[str, Any]) -> NormalizedJob:
    location = raw.get("location") or {}
    salary = raw.get("salary") or {}
    return NormalizedJob(
        external_id=str(raw.get("id") or raw.get("shortcode")),
        title=raw.get("title") or raw.get("full_title") or "",
        description=raw.get("description") or "",
        location=location.get("location_str") or location.get("city") or "",
        department=raw.get("department") or "",
        employment_type=raw.get("employment_type") or "",
        status=_STATUS_MAP.get(raw.get("state"), "UNKNOWN"),
        salary_min=salary.get("salary_from"),
        salary_max=salary.get("salary_to"),
        salary_currency=salary.get("salary_currency") or "",
        ats_created_at=raw.get("created_at"),
        raw=raw,
    )
