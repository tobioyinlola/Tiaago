"""Breezy HR (https://developer.breezy.hr/reference/overview).

Unique key "breezy-hr" -- already configured in Nango at the time this was
written; Nango's own base-URL templating is trusted to resolve the
account-specific host the same way it does for Workable's subdomain.

Structural quirk: Breezy has no flat "all candidates" endpoint -- candidates
are nested under a position (`/positions/{position_id}/candidates`). So
fetch_candidates has to list positions first, then fetch each position's
candidates; it does this independently of fetch_jobs (a second positions
fetch) to keep both generators self-contained, matching every other
provider module's interface.

LOWER CONFIDENCE: response wrapper/pagination field names below are our best
inference from Breezy's docs, not verified against a live account.
"""

from typing import Any, Iterator

from .base import NormalizedCandidate, NormalizedJob
from ..nango_client import proxy_get

PROVIDER_CONFIG_KEY = "breezy-hr"

_STATUS_MAP = {
    "active": "OPEN",
    "on_hold": "DRAFT",
    "closed": "CLOSED",
    "filled": "CLOSED",
    "cancelled": "CLOSED",
    "draft": "DRAFT",
}


def _list_positions(connection_id: str) -> list[dict[str, Any]]:
    data = proxy_get(
        connection_id=connection_id, provider_config_key=PROVIDER_CONFIG_KEY, endpoint="/positions", params={"state": "all"}
    ).json()
    return data if isinstance(data, list) else data.get("positions") or data.get("data") or []


def fetch_candidates(connection_id: str) -> Iterator[dict[str, Any]]:
    for position in _list_positions(connection_id):
        position_id = position.get("_id") or position.get("id")
        if not position_id:
            continue
        data = proxy_get(
            connection_id=connection_id,
            provider_config_key=PROVIDER_CONFIG_KEY,
            endpoint=f"/positions/{position_id}/candidates",
        ).json()
        candidates = data if isinstance(data, list) else data.get("candidates") or data.get("data") or []
        for candidate in candidates:
            candidate.setdefault("_position_id", position_id)
            yield candidate


def fetch_jobs(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _list_positions(connection_id)


def normalize_candidate(raw: dict[str, Any]) -> NormalizedCandidate:
    name = raw.get("name") or {}
    email_addresses = raw.get("email_addresses") or []
    phone_numbers = raw.get("phone_numbers") or []
    address = raw.get("address") or {}
    return NormalizedCandidate(
        external_id=str(raw.get("_id") or raw.get("id")),
        first_name=name.get("given_name", "") if isinstance(name, dict) else "",
        last_name=name.get("family_name", "") if isinstance(name, dict) else "",
        email=(email_addresses[0] or {}).get("email", "") if email_addresses else raw.get("email_address", ""),
        phone=(phone_numbers[0] or {}).get("number", "") if phone_numbers else "",
        resume_url=(raw.get("resume") or {}).get("url", "") if isinstance(raw.get("resume"), dict) else "",
        stage=(raw.get("stage") or {}).get("name", "") if isinstance(raw.get("stage"), dict) else "",
        source=(raw.get("source") or {}).get("name", "") if isinstance(raw.get("source"), dict) else "",
        tags=raw.get("tags") or [],
        ats_job_external_ids=[str(raw["_position_id"])] if raw.get("_position_id") else [],
        ats_created_at=raw.get("creation_date") or raw.get("created_date"),
        location=", ".join(filter(None, [address.get("city"), address.get("state"), address.get("country")]))
        if isinstance(address, dict)
        else "",
        cover_letter=raw.get("cover_letter") or "",
        raw=raw,
    )


def normalize_job(raw: dict[str, Any]) -> NormalizedJob:
    location = raw.get("location") or {}
    department = raw.get("department")
    return NormalizedJob(
        external_id=str(raw.get("_id") or raw.get("id")),
        title=raw.get("name") or raw.get("title") or "",
        description=raw.get("description") or "",
        location=location.get("name", "") if isinstance(location, dict) else (location or ""),
        department=department.get("name", "") if isinstance(department, dict) else (department or ""),
        employment_type=raw.get("employment_type") or raw.get("type") or "",
        status=_STATUS_MAP.get((raw.get("state") or "").lower(), "UNKNOWN"),
        salary_min=None,
        salary_max=None,
        salary_currency="",
        ats_created_at=raw.get("creation_date") or raw.get("created_date"),
        raw=raw,
    )
