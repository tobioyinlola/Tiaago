"""The Talent Network matching engine.

score_member_for_job() is the single source of truth for match scoring --
used both by the real notification task (talent_network.tasks) and the
recruiter's live "estimated reach" preview on the job wizard's publish step
(jobs.views), so the number a recruiter sees before publishing is exactly
the number that determines who actually gets emailed.

Weights (of the total 100-point score):
  Role       40%  -- job.role_category must be one the member said they're
                     interested in. All-or-nothing: a job with no
                     role_category set can never match (safe default for
                     legacy/uncategorized jobs).
  Location   20%  -- average of two independent yes/no signals:
                       - work mode matches the member's stated preference
                       - the job's country is one of the member's preferred
                         locations, OR the job is fully remote (remote work
                         is location-agnostic, so it always satisfies this
                         half regardless of country)
  Industry   20%  -- job.industry must be one the member selected.
                     All-or-nothing, same reasoning as Role.
  Experience 20%  -- job.experience (years, an existing plain integer field)
                     compared against the member's stated experience
                     bracket: full credit inside the bracket, half credit
                     one bracket away, half credit if the job simply didn't
                     specify a requirement (not enough information to
                     disqualify), zero otherwise.

A member is eligible for notification once their total score is >= 60.
"""

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from .choices import YEARS_EXPERIENCE_ORDER, YEARS_EXPERIENCE_RANGES, TalentNetworkWorkMode

if TYPE_CHECKING:
    from jobs.models import Job

    from .models import TalentNetworkMember

MATCH_THRESHOLD = 60

ROLE_WEIGHT = 40
LOCATION_WEIGHT = 20
INDUSTRY_WEIGHT = 20
EXPERIENCE_WEIGHT = 20


@dataclass
class MatchResult:
    score: int
    breakdown: dict = field(default_factory=dict)

    @property
    def is_match(self) -> bool:
        return self.score >= MATCH_THRESHOLD


def _role_score(member: "TalentNetworkMember", job: "Job") -> float:
    if not job.role_category:
        return 0.0
    return 1.0 if job.role_category in member.interested_roles else 0.0


def _location_score(member: "TalentNetworkMember", job: "Job") -> float:
    work_mode_match = 1.0 if job.work_mode and job.work_mode == member.preferred_work_type else 0.0

    if job.work_mode == TalentNetworkWorkMode.REMOTE:
        country_match = 1.0  # remote work is location-agnostic
    else:
        country_match = 1.0 if job.country and job.country in member.preferred_locations else 0.0

    return (work_mode_match + country_match) / 2


def _industry_score(member: "TalentNetworkMember", job: "Job") -> float:
    if not job.industry:
        return 0.0
    return 1.0 if job.industry in member.industry else 0.0


def _experience_score(member: "TalentNetworkMember", job: "Job") -> float:
    if job.experience is None:
        return 0.5  # not enough information to disqualify

    bucket = member.years_experience
    bucket_range = YEARS_EXPERIENCE_RANGES.get(bucket)
    if bucket_range is None:
        return 0.0

    low, high = bucket_range
    if low <= job.experience <= high:
        return 1.0

    try:
        idx = YEARS_EXPERIENCE_ORDER.index(bucket)
    except ValueError:
        return 0.0

    adjacent_ranges = []
    if idx > 0:
        adjacent_ranges.append(YEARS_EXPERIENCE_RANGES[YEARS_EXPERIENCE_ORDER[idx - 1]])
    if idx < len(YEARS_EXPERIENCE_ORDER) - 1:
        adjacent_ranges.append(YEARS_EXPERIENCE_RANGES[YEARS_EXPERIENCE_ORDER[idx + 1]])

    for adj_low, adj_high in adjacent_ranges:
        if adj_low <= job.experience <= adj_high:
            return 0.5

    return 0.0


def score_member_for_job(member: "TalentNetworkMember", job: "Job") -> MatchResult:
    role = _role_score(member, job)
    location = _location_score(member, job)
    industry = _industry_score(member, job)
    experience = _experience_score(member, job)

    total = round(role * ROLE_WEIGHT + location * LOCATION_WEIGHT + industry * INDUSTRY_WEIGHT + experience * EXPERIENCE_WEIGHT)

    return MatchResult(
        score=total,
        breakdown={
            "role": {"matched": role == 1.0, "weight": ROLE_WEIGHT, "points": round(role * ROLE_WEIGHT)},
            "location": {"score": location, "weight": LOCATION_WEIGHT, "points": round(location * LOCATION_WEIGHT)},
            "industry": {"matched": industry == 1.0, "weight": INDUSTRY_WEIGHT, "points": round(industry * INDUSTRY_WEIGHT)},
            "experience": {"score": experience, "weight": EXPERIENCE_WEIGHT, "points": round(experience * EXPERIENCE_WEIGHT)},
        },
    )


def find_matching_members(job: "Job"):
    """Candidate queryset for a job -- pre-filters to members who could
    plausibly match before scoring each one in Python (array-membership
    filters at the DB level, then the exact weighted score is computed
    per-member since it isn't expressible as a single SQL aggregate)."""
    from .choices import TalentNetworkMemberStatus
    from .models import TalentNetworkMember

    if not job.role_category:
        return TalentNetworkMember.objects.none()

    return TalentNetworkMember.objects.filter(
        status=TalentNetworkMemberStatus.ACTIVE,
        consent=True,
        interested_roles__contains=[job.role_category],
    )
