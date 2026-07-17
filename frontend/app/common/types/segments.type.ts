export type MatchType = "ALL" | "ANY";

export type PropertyOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "not_contains";

export type HasTagCondition = { type: "has_tag" | "does_not_have_tag"; tag_slug: string };
export type PropertyCondition = { type: "property"; field: string; operator: PropertyOperator; value: string };
export type SegmentCondition = HasTagCondition | PropertyCondition;

export type AudienceSegment = {
  id: string;
  name: string;
  description: string;
  conditions: SegmentCondition[];
  match_type: MatchType;
  estimated_size: number;
  last_evaluated_at: string | null;
  created_by_admin: number | null;
  created_at: string;
  updated_at: string;
};

export type SegmentPreview = {
  estimated_size: number;
  sample_organisations: { id: number; company_name: string }[];
  match_type: MatchType;
  breakdown: { condition: SegmentCondition; count: number }[] | null;
};

export const PROPERTY_FIELDS = [
  { value: "country", label: "Country" },
  { value: "size", label: "Company size" },
  { value: "industry", label: "Industry" },
  { value: "account_type", label: "Account type" },
  { value: "heard_from", label: "Heard from" },
  { value: "utm_source", label: "UTM source" },
  { value: "wallet_balance", label: "Wallet balance" },
];

export const OPERATOR_LABELS: Record<PropertyOperator, string> = {
  eq: "is",
  neq: "is not",
  gt: "greater than",
  gte: "greater than or equal to",
  lt: "less than",
  lte: "less than or equal to",
  contains: "contains",
  not_contains: "does not contain",
};

export type SegmentTemplate = {
  name: string;
  description: string;
  match_type: MatchType;
  conditions: SegmentCondition[];
};

export const SEGMENT_TEMPLATES: SegmentTemplate[] = [
  {
    name: "Upsell assessments to active screeners",
    description: "Orgs actively screening resumes who have never used assessments.",
    match_type: "ALL",
    conditions: [
      { type: "has_tag", tag_slug: "power-screener" },
      { type: "has_tag", tag_slug: "assessment-never-used" },
    ],
  },
  {
    name: "Nigeria market",
    description: "Active organisations based in Nigeria.",
    match_type: "ALL",
    conditions: [
      { type: "property", field: "country", operator: "eq", value: "Nigeria" },
      { type: "has_tag", tag_slug: "active" },
    ],
  },
  {
    name: "Win back dormant orgs",
    description: "Organisations that have gone quiet.",
    match_type: "ANY",
    conditions: [
      { type: "has_tag", tag_slug: "dormant" },
      { type: "has_tag", tag_slug: "churned" },
    ],
  },
  {
    name: "Low wallet, high usage",
    description: "Heavy screeners running low on wallet balance.",
    match_type: "ALL",
    conditions: [
      { type: "has_tag", tag_slug: "low-wallet-balance" },
      { type: "has_tag", tag_slug: "heavy-screener" },
    ],
  },
  {
    name: "New signups this week",
    description: "Freshly signed-up organisations to onboard.",
    match_type: "ALL",
    conditions: [{ type: "has_tag", tag_slug: "new-signup" }],
  },
  {
    name: "Solo users to convert to teams",
    description: "Active solo accounts who haven't invited a team yet.",
    match_type: "ALL",
    conditions: [
      { type: "has_tag", tag_slug: "solo-user" },
      { type: "has_tag", tag_slug: "active" },
    ],
  },
  {
    name: "Pipeline power users",
    description: "Orgs heavily using the sourcing pipeline.",
    match_type: "ALL",
    conditions: [{ type: "has_tag", tag_slug: "pipeline-power-user" }],
  },
  {
    name: "Re-engaged this week",
    description: "Orgs that came back after going quiet.",
    match_type: "ALL",
    conditions: [{ type: "has_tag", tag_slug: "re-engaged" }],
  },
];
