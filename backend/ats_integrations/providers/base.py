"""The shared internal shape every ATS provider's raw response gets mapped
into, regardless of how that provider names/nests its fields (e.g.
Greenhouse's keyed custom fields vs Lever's flat tags vs Workable's nested
`candidate.address`). ats_integrations.services.upsert_* reads only these
keys -- provider modules never write directly to the Django models."""

from typing import Any, Iterator, Protocol, TypedDict
from urllib.parse import parse_qs, urlparse


class NormalizedCandidate(TypedDict, total=False):
    external_id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    resume_url: str
    stage: str
    source: str
    tags: list[str]
    ats_job_external_ids: list[str]
    ats_created_at: str | None  # ISO 8601 datetime string
    location: str
    linkedin_url: str
    portfolio_urls: list[str]  # any other links from the candidate's profile (GitHub, personal site, Twitter, etc.)
    current_title: str
    current_company: str
    cover_letter: str
    education: list[dict[str, Any]]  # best-effort [{school, degree, field, start_date, end_date}]
    work_experience: list[dict[str, Any]]  # best-effort [{company, title, start_date, end_date}]
    application_answers: list[dict[str, Any]]  # custom screening-question responses, where the ATS exposes them
    raw: dict[str, Any]


class NormalizedJob(TypedDict, total=False):
    external_id: str
    title: str
    description: str
    location: str
    department: str
    employment_type: str
    status: str  # "OPEN" | "CLOSED" | "DRAFT" | "UNKNOWN"
    salary_min: float | None
    salary_max: float | None
    salary_currency: str
    ats_created_at: str | None
    raw: dict[str, Any]


class AtsProviderModule(Protocol):
    """Every provider module in this package implements this interface."""

    PROVIDER_CONFIG_KEY: str

    def fetch_candidates(self, connection_id: str) -> Iterator[dict[str, Any]]: ...
    def fetch_jobs(self, connection_id: str) -> Iterator[dict[str, Any]]: ...
    def normalize_candidate(self, raw: dict[str, Any]) -> NormalizedCandidate: ...
    def normalize_job(self, raw: dict[str, Any]) -> NormalizedJob: ...


def extract_query_param(url: str, key: str) -> str | None:
    """Pulls a single query param out of a full pagination-cursor URL, e.g.
    Workable's `paging.next` is a complete URL rather than a bare cursor."""
    if not url:
        return None
    values = parse_qs(urlparse(url).query).get(key)
    return values[0] if values else None
