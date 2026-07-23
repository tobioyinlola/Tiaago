"""Workday, OAuth 2.0 via Nango's pre-built "Workday (OAuth)" template.

IMPORTANT: Workday has two entirely different API surfaces. The classic
"Workday Web Services" (unique key just "workday" in Nango) are SOAP/XML,
authenticated with a tenant Integration System User over Basic Auth --
building a client for that would mean constructing SOAP envelopes and
parsing XML, a structurally different job than every other provider in
this package. Workday also offers a newer REST API (OAuth 2.0, JSON),
which is what this module uses via Nango's "Workday (OAuth)" template --
it fits the same proxy_get/JSON pattern as every other provider here.
Connection config (Authorization Domain, Token Domain, Tenant) is entered
by the recruiter in Nango's Connect UI; as with Workable's subdomain,
Nango's pre-built template resolves these into the request host, so this
module only ever needs to supply the path.

LOWEST CONFIDENCE OF ANY PROVIDER IN THIS PACKAGE, on par with Jobvite:
Workday's REST API reference is gated behind a customer/partner community
account, so most of this is inferred from secondary sources, not a
verified spec:
  - /ccx/api/recruiting/{version}/jobPostings is a real, confirmed
    endpoint (job postings, filterable by requisition/site/active status).
  - There is no public confirmation of the exact candidates/applications
    list endpoint or its field names -- "/candidates" below is a
    best-effort guess following Workday's REST resource-naming
    conventions, not a verified path. Expect to adjust the endpoint path
    itself (not just field names) once tested against a real tenant.
  - Workday's REST API is well known to represent every referenced object
    as a {"id": ..., "descriptor": ...} pair (an opaque WID plus a
    human-readable label) -- normalize_* below relies on that shape for
    nested fields, which is a genuine, well-documented Workday convention
    independent of the endpoint-path uncertainty above.
  - The API version segment (WORKDAY_RECRUITING_API_VERSION) is a
    plausible-but-unconfirmed recent version string; if Workday rejects
    requests with a version-mismatch error, update it to whatever version
    your tenant's API documentation page shows as current.
"""

from typing import Any, Iterator

from .base import NormalizedCandidate, NormalizedJob
from ..nango_client import proxy_get

PROVIDER_CONFIG_KEY = "workday-oauth"

WORKDAY_RECRUITING_API_VERSION = "v41.2"

_STATUS_MAP = {
    "open": "OPEN",
    "filled": "CLOSED",
    "closed": "CLOSED",
    "draft": "DRAFT",
    "canceled": "CLOSED",
    "frozen": "DRAFT",
}


def _descriptor(value: Any) -> str:
    """Workday's REST API represents every referenced object as
    {"id": ..., "descriptor": "human readable label"} -- this pulls the
    label back out regardless of whether the field is that shape, a plain
    string, or missing."""
    if isinstance(value, dict):
        return value.get("descriptor") or ""
    return value or ""


def _paginate(connection_id: str, endpoint: str) -> Iterator[dict[str, Any]]:
    offset = 0
    limit = 100
    while True:
        data = proxy_get(
            connection_id=connection_id,
            provider_config_key=PROVIDER_CONFIG_KEY,
            endpoint=endpoint,
            params={"limit": limit, "offset": offset},
        ).json()
        items = data.get("data") or []
        if not items:
            return
        yield from items
        total = data.get("total")
        offset += limit
        if total is not None and offset >= total:
            return
        if len(items) < limit:
            return


def fetch_candidates(connection_id: str) -> Iterator[dict[str, Any]]:
    # Endpoint path is an unverified guess -- see module docstring.
    yield from _paginate(connection_id, f"/ccx/api/recruiting/{WORKDAY_RECRUITING_API_VERSION}/candidates")


def fetch_jobs(connection_id: str) -> Iterator[dict[str, Any]]:
    yield from _paginate(connection_id, f"/ccx/api/recruiting/{WORKDAY_RECRUITING_API_VERSION}/jobPostings")


def normalize_candidate(raw: dict[str, Any]) -> NormalizedCandidate:
    contact = raw.get("contactData") or {}
    emails = contact.get("emailAddressData") or raw.get("emailAddresses") or []
    phones = contact.get("phoneData") or raw.get("phoneNumbers") or []
    job_posting = raw.get("jobPosting") or raw.get("appliedToJobPosting")
    return NormalizedCandidate(
        external_id=str(raw.get("id")),
        first_name=raw.get("firstName") or raw.get("legalName_First_Name") or "",
        last_name=raw.get("lastName") or raw.get("legalName_Last_Name") or "",
        email=(emails[0].get("emailAddress") if emails and isinstance(emails[0], dict) else raw.get("email")) or "",
        phone=(phones[0].get("phoneNumber") if phones and isinstance(phones[0], dict) else raw.get("phone")) or "",
        resume_url="",  # resumes live as Workday attachment documents, not a plain URL field -- known gap
        stage=_descriptor(raw.get("stage") or raw.get("candidateStage")),
        source=_descriptor(raw.get("source") or raw.get("candidateSource")),
        tags=[],
        ats_job_external_ids=[str(job_posting["id"])] if isinstance(job_posting, dict) and job_posting.get("id") else [],
        ats_created_at=raw.get("appliedOn") or raw.get("createdMoment"),
        location=_descriptor(raw.get("location") or raw.get("candidateLocation")),
        raw=raw,
    )


def normalize_job(raw: dict[str, Any]) -> NormalizedJob:
    location = raw.get("primaryLocation") or raw.get("location")
    worker_type = raw.get("workerType") or raw.get("timeType")
    return NormalizedJob(
        external_id=str(raw.get("id")),
        title=raw.get("jobPostingTitle") or raw.get("title") or "",
        description=raw.get("jobDescription") or raw.get("description") or "",
        location=_descriptor(location),
        department=_descriptor(raw.get("supervisoryOrganization") or raw.get("department")),
        employment_type=_descriptor(worker_type),
        status=_STATUS_MAP.get((_descriptor(raw.get("postingStatus") or raw.get("status")) or "").lower(), "UNKNOWN"),
        salary_min=None,
        salary_max=None,
        salary_currency="",
        ats_created_at=raw.get("postedOn") or raw.get("startDate"),
        raw=raw,
    )
