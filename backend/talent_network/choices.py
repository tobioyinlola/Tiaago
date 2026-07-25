"""Shared choice enums for the Talent Network feature.

Deliberately dependency-free (no imports from other apps' models) so that
jobs.models.Job can import TalentNetworkRoleCategory/Industry/WorkMode
directly without creating a circular import between the `jobs` and
`talent_network` apps -- this is the one source of truth for these lists,
used by both the recruiter's job form and the public registration form so
the matching engine always compares like-for-like values.
"""

from django.db import models


class TalentNetworkRoleCategory(models.TextChoices):
    PRODUCT_MANAGEMENT = "PRODUCT_MANAGEMENT", "Product Management"
    ENGINEERING = "ENGINEERING", "Engineering"
    BACKEND_ENGINEERING = "BACKEND_ENGINEERING", "Backend Engineering"
    FRONTEND_ENGINEERING = "FRONTEND_ENGINEERING", "Frontend Engineering"
    FULL_STACK = "FULL_STACK", "Full Stack"
    DEVOPS = "DEVOPS", "DevOps"
    AI_ML = "AI_ML", "AI/ML"
    UI_UX_DESIGN = "UI_UX_DESIGN", "UI/UX Design"
    DATA = "DATA", "Data"
    MARKETING = "MARKETING", "Marketing"
    SALES = "SALES", "Sales"
    CUSTOMER_SUCCESS = "CUSTOMER_SUCCESS", "Customer Success"
    FINANCE = "FINANCE", "Finance"
    OPERATIONS = "OPERATIONS", "Operations"
    HR = "HR", "HR"
    LEGAL = "LEGAL", "Legal"
    BUSINESS_DEVELOPMENT = "BUSINESS_DEVELOPMENT", "Business Development"
    OTHER = "OTHER", "Other"


class TalentNetworkIndustry(models.TextChoices):
    FINTECH = "FINTECH", "Fintech"
    HRTECH = "HRTECH", "HRTech"
    HEALTHTECH = "HEALTHTECH", "HealthTech"
    EDTECH = "EDTECH", "EdTech"
    SAAS = "SAAS", "SaaS"
    ECOMMERCE = "ECOMMERCE", "E-commerce"
    AI = "AI", "AI"
    BLOCKCHAIN = "BLOCKCHAIN", "Blockchain"
    CONSULTING = "CONSULTING", "Consulting"
    OTHER = "OTHER", "Other"


class TalentNetworkWorkMode(models.TextChoices):
    REMOTE = "REMOTE", "Remote"
    HYBRID = "HYBRID", "Hybrid"
    ONSITE = "ONSITE", "On-site"


class TalentNetworkYearsExperience(models.TextChoices):
    RANGE_0_2 = "0-2", "0-2 Years"
    RANGE_2_5 = "2-5", "2-5 Years"
    RANGE_5_8 = "5-8", "5-8 Years"
    RANGE_8_12 = "8-12", "8-12 Years"
    RANGE_12_PLUS = "12+", "12+ Years"


# (low, high) year bounds per bucket, used by the matching engine to compare
# against a job's plain-integer `experience` field. "12+" has no real upper
# bound, so 99 is used as a practical ceiling.
YEARS_EXPERIENCE_RANGES = {
    TalentNetworkYearsExperience.RANGE_0_2: (0, 2),
    TalentNetworkYearsExperience.RANGE_2_5: (2, 5),
    TalentNetworkYearsExperience.RANGE_5_8: (5, 8),
    TalentNetworkYearsExperience.RANGE_8_12: (8, 12),
    TalentNetworkYearsExperience.RANGE_12_PLUS: (12, 99),
}

# Ordered so "adjacent bucket" (index +/- 1) is a well-defined concept for
# the matching engine's partial-credit rule.
YEARS_EXPERIENCE_ORDER = [
    TalentNetworkYearsExperience.RANGE_0_2,
    TalentNetworkYearsExperience.RANGE_2_5,
    TalentNetworkYearsExperience.RANGE_5_8,
    TalentNetworkYearsExperience.RANGE_8_12,
    TalentNetworkYearsExperience.RANGE_12_PLUS,
]


class TalentNetworkCommunity(models.TextChoices):
    GOOGLE_DEVELOPER_GROUPS = "GOOGLE_DEVELOPER_GROUPS", "Google Developer Groups"
    MICROSOFT_REACTOR = "MICROSOFT_REACTOR", "Microsoft Reactor"
    PRODUCTDIVE = "PRODUCTDIVE", "ProductDive"
    CAMPUS_TECH_FOUNDERS = "CAMPUS_TECH_FOUNDERS", "Campus Tech Founders"
    ALX = "ALX", "ALX"
    SHE_CODE_AFRICA = "SHE_CODE_AFRICA", "She Code Africa"
    DEVELOPER_STUDENT_CLUBS = "DEVELOPER_STUDENT_CLUBS", "Developer Student Clubs"
    FACEBOOK_DEVELOPER_CIRCLES = "FACEBOOK_DEVELOPER_CIRCLES", "Facebook Developer Circles"
    WOMEN_TECHMAKERS = "WOMEN_TECHMAKERS", "Women Techmakers"
    HNG = "HNG", "HNG"
    GENESYS = "GENESYS", "Genesys"
    SEMICOLON = "SEMICOLON", "Semicolon"
    ALTSCHOOL = "ALTSCHOOL", "AltSchool"
    UNILAG_TECH = "UNILAG_TECH", "Unilag Tech"
    OAU_TECH_COMMUNITY = "OAU_TECH_COMMUNITY", "OAU Tech Community"
    LASU_TECH = "LASU_TECH", "LASU Tech"
    TECH_TWITTER = "TECH_TWITTER", "Tech Twitter"
    NONE = "NONE", "None"


class TalentNetworkEmailFrequency(models.TextChoices):
    IMMEDIATE = "IMMEDIATE", "Immediately"
    DAILY_DIGEST = "DAILY_DIGEST", "Daily Digest"
    WEEKLY_DIGEST = "WEEKLY_DIGEST", "Weekly Digest"


class TalentNetworkMemberStatus(models.TextChoices):
    PENDING_CONFIRMATION = "PENDING_CONFIRMATION", "Pending Confirmation"
    ACTIVE = "ACTIVE", "Active"
    UNSUBSCRIBED = "UNSUBSCRIBED", "Unsubscribed"
    DEACTIVATED = "DEACTIVATED", "Deactivated"
