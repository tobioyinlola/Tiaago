export type TemplateCategory =
  | "ONBOARDING"
  | "UPSELL"
  | "WINBACK"
  | "ANNOUNCEMENT"
  | "EDUCATIONAL"
  | "TRANSACTIONAL"
  | "CUSTOM";

export type HeaderBlock = { type: "HEADER"; logo_url?: string; background_colour: string; subtitle?: string };
export type TextBlock = { type: "TEXT"; html: string; font_size: "body" | "large"; align: "left" | "center" };
export type ButtonBlock = { type: "BUTTON"; label: string; url: string; colour: string; align: "left" | "center" | "right" };
export type ImageBlock = { type: "IMAGE"; url: string; alt: string; link_url?: string };
export type DividerBlock = { type: "DIVIDER"; colour: string };
export type SpacerBlock = { type: "SPACER"; height: "small" | "medium" | "large" };
export type StatBlock = { type: "STAT"; label: string; merge_tag: string };
export type FooterBlock = {
  type: "FOOTER";
  company_name: string;
  address: string;
  privacy_url: string;
  social_links: { platform: string; url: string }[];
};

export type EmailBlock =
  | HeaderBlock
  | TextBlock
  | ButtonBlock
  | ImageBlock
  | DividerBlock
  | SpacerBlock
  | StatBlock
  | FooterBlock;

export type EmailTemplate = {
  id: string;
  name: string;
  category: TemplateCategory;
  subject_line: string;
  preview_text: string;
  blocks: EmailBlock[];
  html_body: string;
  plain_text_body: string;
  merge_tags: string[];
  thumbnail_url: string | null;
  is_preset: boolean;
  created_at: string;
  updated_at: string;
};

export const MERGE_TAGS = [
  { tag: "first_name", label: "First name" },
  { tag: "org_name", label: "Organisation name" },
  { tag: "wallet_balance", label: "Wallet balance" },
  { tag: "resumes_screened_total", label: "Resumes screened (all time)" },
  { tag: "resumes_screened_month", label: "Resumes screened (this month)" },
  { tag: "assessments_total", label: "Assessments taken" },
  { tag: "active_jobs", label: "Active jobs" },
  { tag: "pipeline_count", label: "Pipeline candidates" },
  { tag: "account_age_days", label: "Account age (days)" },
  { tag: "unsubscribe_url", label: "Unsubscribe link" },
];

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  ONBOARDING: "Onboarding",
  UPSELL: "Upsell",
  WINBACK: "Winback",
  ANNOUNCEMENT: "Announcement",
  EDUCATIONAL: "Educational",
  TRANSACTIONAL: "Transactional",
  CUSTOM: "Custom",
};

export const BLOCK_LIBRARY: { type: EmailBlock["type"]; label: string; description: string }[] = [
  { type: "HEADER", label: "Header", description: "Logo and optional subtitle" },
  { type: "TEXT", label: "Text", description: "Rich text paragraph" },
  { type: "BUTTON", label: "Button", description: "Call-to-action link" },
  { type: "IMAGE", label: "Image", description: "Upload or link an image" },
  { type: "STAT", label: "Stat", description: "Large number driven by a merge tag" },
  { type: "DIVIDER", label: "Divider", description: "Horizontal rule" },
  { type: "SPACER", label: "Spacer", description: "Vertical whitespace" },
];

export type CampaignAudienceType = "SEGMENT" | "TAG" | "MANUAL";
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "CANCELLED" | "PAUSED";
export type CampaignScheduleType = "IMMEDIATE" | "SCHEDULED";

export type EmailCampaign = {
  id: string;
  name: string;
  subject_line: string;
  preview_text: string;
  audience_type: CampaignAudienceType | null;
  audience_segment: string | null;
  audience_segment_name: string | null;
  audience_tag: string | null;
  audience_tag_name: string | null;
  manual_organisation_ids: number[];
  email_template: string | null;
  email_template_name: string | null;
  template_variables: Record<string, unknown>;
  status: CampaignStatus;
  schedule_type: CampaignScheduleType;
  scheduled_for: string | null;
  sent_at: string | null;
  created_by_admin: number | null;
  created_at: string;
  updated_at: string;
  recipient_count: number;
};

export type AudiencePreview = {
  total_organisations: number;
  estimated_recipients: number;
  excluded_unsubscribed: number;
  sample_recipients: { company_id: number; company_name: string; email: string; name: string }[];
};

export type CampaignAnalytics = {
  summary: {
    total_recipients: number;
    delivered: number;
    open_rate_pct: number;
    click_rate_pct: number;
    unsubscribes: number;
    bounces: number;
  };
  opens_over_time_48h: { hour: number; cumulative_opens: number }[];
  clicks_over_time_48h: { hour: number; cumulative_clicks: number }[];
  link_performance: { link_url: string; total_clicks: number; unique_clicks: number; pct_of_recipients: number }[];
  recipients: {
    id: string;
    name: string;
    organisation: string | null;
    email: string;
    status: string;
    opened_at: string | null;
    clicked_at: string | null;
  }[];
};

export const defaultBlockFor = (type: EmailBlock["type"]): EmailBlock => {
  switch (type) {
    case "HEADER":
      return { type: "HEADER", background_colour: "#1A3C5E", subtitle: "" };
    case "TEXT":
      return { type: "TEXT", html: "<p>New text block</p>", font_size: "body", align: "left" };
    case "BUTTON":
      return { type: "BUTTON", label: "Click here", url: "", colour: "#1D9E75", align: "center" };
    case "IMAGE":
      return { type: "IMAGE", url: "", alt: "" };
    case "DIVIDER":
      return { type: "DIVIDER", colour: "#E5E7EB" };
    case "SPACER":
      return { type: "SPACER", height: "medium" };
    case "STAT":
      return { type: "STAT", label: "Stat label", merge_tag: MERGE_TAGS[0].tag };
    case "FOOTER":
      return { type: "FOOTER", company_name: "Tiaago", address: "", privacy_url: "https://www.tiaago.com/privacy-policy", social_links: [] };
  }
};
