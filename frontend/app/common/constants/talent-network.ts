/** Shared Talent Network types/option lists -- deliberately NOT in
 * services/talent-network.ts, since that file is "use server" and Next.js
 * requires every export from a "use server" file to be an async function;
 * plain constant arrays like these would break the server-actions build.
 * Mirrors backend talent_network/choices.py so both sides compare
 * like-for-like values. */

export type TalentNetworkYearsExperience = "0-2" | "2-5" | "5-8" | "8-12" | "12+";
export type TalentNetworkWorkMode = "REMOTE" | "HYBRID" | "ONSITE";
export type TalentNetworkEmailFrequency = "IMMEDIATE" | "DAILY_DIGEST" | "WEEKLY_DIGEST";

export type TalentNetworkRoleCategory =
  | "PRODUCT_MANAGEMENT" | "ENGINEERING" | "BACKEND_ENGINEERING" | "FRONTEND_ENGINEERING"
  | "FULL_STACK" | "DEVOPS" | "AI_ML" | "UI_UX_DESIGN" | "DATA" | "MARKETING" | "SALES"
  | "CUSTOMER_SUCCESS" | "FINANCE" | "OPERATIONS" | "HR" | "LEGAL" | "BUSINESS_DEVELOPMENT" | "OTHER";

export type TalentNetworkIndustry =
  | "FINTECH" | "HRTECH" | "HEALTHTECH" | "EDTECH" | "SAAS" | "ECOMMERCE" | "AI" | "BLOCKCHAIN"
  | "CONSULTING" | "OTHER";

export type TalentNetworkCommunity =
  | "GOOGLE_DEVELOPER_GROUPS" | "MICROSOFT_REACTOR" | "PRODUCTDIVE" | "CAMPUS_TECH_FOUNDERS"
  | "ALX" | "SHE_CODE_AFRICA" | "DEVELOPER_STUDENT_CLUBS" | "FACEBOOK_DEVELOPER_CIRCLES"
  | "WOMEN_TECHMAKERS" | "HNG" | "GENESYS" | "SEMICOLON" | "ALTSCHOOL" | "UNILAG_TECH"
  | "OAU_TECH_COMMUNITY" | "LASU_TECH" | "TECH_TWITTER" | "NONE";

export const ROLE_CATEGORY_OPTIONS: { value: TalentNetworkRoleCategory; label: string }[] = [
  { value: "PRODUCT_MANAGEMENT", label: "Product Management" },
  { value: "ENGINEERING", label: "Engineering" },
  { value: "BACKEND_ENGINEERING", label: "Backend Engineering" },
  { value: "FRONTEND_ENGINEERING", label: "Frontend Engineering" },
  { value: "FULL_STACK", label: "Full Stack" },
  { value: "DEVOPS", label: "DevOps" },
  { value: "AI_ML", label: "AI/ML" },
  { value: "UI_UX_DESIGN", label: "UI/UX Design" },
  { value: "DATA", label: "Data" },
  { value: "MARKETING", label: "Marketing" },
  { value: "SALES", label: "Sales" },
  { value: "CUSTOMER_SUCCESS", label: "Customer Success" },
  { value: "FINANCE", label: "Finance" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "HR", label: "HR" },
  { value: "LEGAL", label: "Legal" },
  { value: "BUSINESS_DEVELOPMENT", label: "Business Development" },
  { value: "OTHER", label: "Other" },
];

export const INDUSTRY_OPTIONS: { value: TalentNetworkIndustry; label: string }[] = [
  { value: "FINTECH", label: "Fintech" },
  { value: "HRTECH", label: "HRTech" },
  { value: "HEALTHTECH", label: "HealthTech" },
  { value: "EDTECH", label: "EdTech" },
  { value: "SAAS", label: "SaaS" },
  { value: "ECOMMERCE", label: "E-commerce" },
  { value: "AI", label: "AI" },
  { value: "BLOCKCHAIN", label: "Blockchain" },
  { value: "CONSULTING", label: "Consulting" },
  { value: "OTHER", label: "Other" },
];

export const COMMUNITY_OPTIONS: { value: TalentNetworkCommunity; label: string }[] = [
  { value: "GOOGLE_DEVELOPER_GROUPS", label: "Google Developer Groups" },
  { value: "MICROSOFT_REACTOR", label: "Microsoft Reactor" },
  { value: "PRODUCTDIVE", label: "ProductDive" },
  { value: "CAMPUS_TECH_FOUNDERS", label: "Campus Tech Founders" },
  { value: "ALX", label: "ALX" },
  { value: "SHE_CODE_AFRICA", label: "She Code Africa" },
  { value: "DEVELOPER_STUDENT_CLUBS", label: "Developer Student Clubs" },
  { value: "FACEBOOK_DEVELOPER_CIRCLES", label: "Facebook Developer Circles" },
  { value: "WOMEN_TECHMAKERS", label: "Women Techmakers" },
  { value: "HNG", label: "HNG" },
  { value: "GENESYS", label: "Genesys" },
  { value: "SEMICOLON", label: "Semicolon" },
  { value: "ALTSCHOOL", label: "AltSchool" },
  { value: "UNILAG_TECH", label: "Unilag Tech" },
  { value: "OAU_TECH_COMMUNITY", label: "OAU Tech Community" },
  { value: "LASU_TECH", label: "LASU Tech" },
  { value: "TECH_TWITTER", label: "Tech Twitter" },
  { value: "NONE", label: "None" },
];

export const YEARS_EXPERIENCE_OPTIONS: { value: TalentNetworkYearsExperience; label: string }[] = [
  { value: "0-2", label: "0-2 Years" },
  { value: "2-5", label: "2-5 Years" },
  { value: "5-8", label: "5-8 Years" },
  { value: "8-12", label: "8-12 Years" },
  { value: "12+", label: "12+ Years" },
];

export const WORK_TYPE_OPTIONS: { value: TalentNetworkWorkMode; label: string }[] = [
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ONSITE", label: "On-site" },
];

export const EMAIL_FREQUENCY_OPTIONS: { value: TalentNetworkEmailFrequency; label: string }[] = [
  { value: "IMMEDIATE", label: "Immediately" },
  { value: "DAILY_DIGEST", label: "Daily Digest" },
  { value: "WEEKLY_DIGEST", label: "Weekly Digest" },
];

export type TalentNetworkJoinPayload = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country: string;
  state?: string;
  city?: string;
  job_title: string;
  years_experience: TalentNetworkYearsExperience;
  industry: TalentNetworkIndustry[];
  interested_roles: TalentNetworkRoleCategory[];
  preferred_work_type: TalentNetworkWorkMode;
  preferred_locations: string[];
  communities: TalentNetworkCommunity[];
  other_community?: string;
  email_frequency: TalentNetworkEmailFrequency;
  consent: boolean;
};
