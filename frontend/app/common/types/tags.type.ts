export type TagType = "SYSTEM" | "CUSTOM";

export type TagCategory =
  | "LIFECYCLE"
  | "WALLET"
  | "SCREENING"
  | "ASSESSMENT"
  | "PIPELINE"
  | "TEAM"
  | "ENGAGEMENT"
  | "CUSTOM";

export type Tag = {
  id: string;
  name: string;
  slug: string;
  description: string;
  colour: string;
  tag_type: TagType;
  category: TagCategory;
  is_active: boolean;
  created_at: string;
  created_by_admin: number | null;
  tagged_organisation_count: number;
};

export type SystemTagsResponse = {
  last_rule_run: string | null;
  results: Tag[];
};

export type OrganisationTag = {
  id: string;
  tag: Tag;
  applied_at: string;
  removed_at: string | null;
  applied_by_admin_name: string | null;
};

export type TagAuditLogEntry = {
  id: string;
  tag_name: string;
  tag_slug: string;
  action: "APPLIED" | "REMOVED";
  triggered_by: "SYSTEM_CRON" | "ADMIN_MANUAL" | "IMPORT";
  admin_name: string | null;
  reason: string;
  occurred_at: string;
};

export type TaggedOrganisation = {
  id: number;
  company_name: string;
  applied_at: string;
};

export const CUSTOM_TAG_COLOUR_PRESETS = [
  "#3B82F6", "#0EA5E9", "#14B8A6", "#16A34A", "#84CC16", "#EAB308",
  "#F97316", "#EF4444", "#DC2626", "#DB2777", "#8B5CF6", "#78716C",
];
