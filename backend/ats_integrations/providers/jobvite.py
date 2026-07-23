"""Jobvite.

LOWEST CONFIDENCE OF ALL PROVIDERS HERE: Jobvite's REST API docs are gated
behind a support-ticket-only partner process (no public reference), so the
endpoint paths, pagination params, and field names below are inferred from
secondary sources, not a verified spec. Nango itself notes it has no
pre-built syncs/actions for Jobvite yet either. Treat this module as a
starting point -- check `raw_data` on the first sync attempt and expect to
adjust endpoint paths and field names once you can see real responses.

Auth: Jobvite issues an API key + secret (and a companyId) via support
ticket; Nango's "Jobvite" integration is configured to inject these as
required. Pagination assumed to be offset-based via `start`/`count`.
"""

from typing import Any, Iterator

from .base import NormalizedCandidate, NormalizedJob
from ..nango_client import proxy_get

PROVIDER_CONFIG_KEY = "jobvite"

_PAGE_SIZE = 100


def _paginate(connection_id: str, endpoint: str, list_key: str) -> Iterator[dict[str, Any]]:
    start = 0
    while True:
        data = proxy_get(
            connection_id=connection_id,
            provider_config_key=PROVIDER_CONFIG_KEY,
            endpoint=endpoint,
            params={"start": start, "count": _PAGE_SIZE},
        ).json()
        items = data.get(list_key) or data.get("results") or data.get("data") or []
        if not items:
            return
        yield from items
        if len(items) < _PAGE_SIZE:
            return
        start += _PAGE_SIZE


def fetch_candidates(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/candidate", "candidate")


def fetch_jobs(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, "/requisition", "requisition")


def normalize_candidate(raw: dict[str, Any]) -> NormalizedCandidate:
    return NormalizedCandidate(
        external_id=str(raw.get("eId") or raw.get("id")),
        first_name=raw.get("firstName") or "",
        last_name=raw.get("lastName") or "",
        email=raw.get("email") or "",
        phone=raw.get("phone") or "",
        resume_url="",
        stage=raw.get("workflowState") or raw.get("status") or "",
        source=raw.get("source") or "",
        tags=[],
        ats_job_external_ids=[str(raw["requisitionId"])] if raw.get("requisitionId") else [],
        ats_created_at=raw.get("dateCreated") or raw.get("appliedDate"),
        raw=raw,
    )


def normalize_job(raw: dict[str, Any]) -> NormalizedJob:
    return NormalizedJob(
        external_id=str(raw.get("eId") or raw.get("id")),
        title=raw.get("title") or "",
        description=raw.get("description") or "",
        location=raw.get("location") or "",
        department=raw.get("department") or "",
        employment_type=raw.get("employmentType") or "",
        status="OPEN" if (raw.get("status") or "").lower() in ("open", "active") else "UNKNOWN",
        salary_min=None,
        salary_max=None,
        salary_currency="",
        ats_created_at=raw.get("dateCreated"),
        raw=raw,
    )
