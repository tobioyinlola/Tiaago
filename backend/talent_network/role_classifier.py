"""Best-effort keyword classifier mapping a job's free-text title (the
existing `Job.role` field) to a TalentNetworkRoleCategory.

Recruiters never pick a role category directly -- the job wizard only ever
collects the plain job title it always has, exactly as before. This keeps
Role (the matching engine's 40%-weighted, all-or-nothing criterion) from
being permanently blank on every job, which would make every match score
cap at 40% and never cross the 60% threshold. Matched case-insensitively,
first keyword group to hit wins; falls back to OTHER rather than blank so a
title that matches nothing still has a real (if generic) signal instead of
disqualifying the job from matching entirely.
"""

from .choices import TalentNetworkRoleCategory

# Ordered most-specific-first: "senior backend engineer" should hit
# BACKEND_ENGINEERING before the generic "engineer" catch-all does.
_KEYWORD_RULES: list[tuple[str, list[str]]] = [
    (TalentNetworkRoleCategory.BACKEND_ENGINEERING, ["backend", "back-end", "back end"]),
    (TalentNetworkRoleCategory.FRONTEND_ENGINEERING, ["frontend", "front-end", "front end", "react developer", "ui developer"]),
    (TalentNetworkRoleCategory.FULL_STACK, ["full stack", "full-stack", "fullstack"]),
    (TalentNetworkRoleCategory.DEVOPS, ["devops", "dev ops", "sre", "site reliability", "infrastructure engineer", "platform engineer"]),
    (TalentNetworkRoleCategory.AI_ML, ["machine learning", "ml engineer", "ai engineer", "data scientist", "artificial intelligence"]),
    (TalentNetworkRoleCategory.UI_UX_DESIGN, ["ux", "ui/ux", "product designer", "graphic designer", "visual designer", "ui designer"]),
    (TalentNetworkRoleCategory.DATA, ["data analyst", "data engineer", "data analytics", "business intelligence", "bi analyst"]),
    (TalentNetworkRoleCategory.PRODUCT_MANAGEMENT, ["product manager", "product owner", "product lead"]),
    (TalentNetworkRoleCategory.MARKETING, ["marketing", "growth manager", "content strategist", "seo specialist", "brand manager"]),
    (TalentNetworkRoleCategory.SALES, ["sales", "account executive", "business development representative", "bdr", "sdr"]),
    (TalentNetworkRoleCategory.CUSTOMER_SUCCESS, ["customer success", "customer support", "customer experience", "client success"]),
    (TalentNetworkRoleCategory.FINANCE, ["finance", "accountant", "accounting", "financial analyst", "controller", "bookkeeper"]),
    (TalentNetworkRoleCategory.HR, ["human resources", "people ops", "people operations", "recruiter", "talent acquisition", " hr "]),
    (TalentNetworkRoleCategory.LEGAL, ["legal counsel", "attorney", "lawyer", "compliance officer", "paralegal"]),
    (TalentNetworkRoleCategory.BUSINESS_DEVELOPMENT, ["business development", "partnerships manager", "biz dev"]),
    (TalentNetworkRoleCategory.OPERATIONS, ["operations manager", "operations lead", "ops manager", "logistics"]),
    # Generic engineering catch-all -- must come after every more-specific
    # engineering rule above, otherwise "Senior Backend Engineer" would
    # match this first.
    (TalentNetworkRoleCategory.ENGINEERING, ["engineer", "developer", "programmer", "software"]),
]


def classify_role_category(title: str) -> str:
    if not title:
        return TalentNetworkRoleCategory.OTHER

    normalized = f" {title.lower()} "
    for category, keywords in _KEYWORD_RULES:
        if any(keyword in normalized for keyword in keywords):
            return category

    return TalentNetworkRoleCategory.OTHER
