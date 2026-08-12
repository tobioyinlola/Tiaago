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

// Merge tags available when a campaign's audience_pool is TALENT_NETWORK --
// distinct from MERGE_TAGS above (company/wallet-centric), since Talent
// Network recipients have no Company or wallet (see
// campaigns.merge_tags.build_talent_network_merge_context on the backend).
export const TALENT_NETWORK_MERGE_TAGS = [
  { tag: "first_name", label: "First name" },
  { tag: "last_name", label: "Last name" },
  { tag: "full_name", label: "Full name" },
  { tag: "job_title", label: "Job title" },
  { tag: "years_experience", label: "Years of experience" },
  { tag: "interested_roles", label: "Interested roles" },
  { tag: "industry", label: "Industry" },
  { tag: "preferred_work_type", label: "Preferred work type" },
  { tag: "city", label: "City" },
  { tag: "country", label: "Country" },
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

export type CampaignAudiencePool = "COMPANY" | "TALENT_NETWORK";
export type CampaignAudienceType = "ALL" | "SEGMENT" | "TAG" | "MANUAL";
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "CANCELLED" | "PAUSED";
export type CampaignScheduleType = "IMMEDIATE" | "SCHEDULED";

export type SendDelayType = "IMMEDIATELY" | "DELAY_AFTER_PREVIOUS";
export type ConditionType = "ALWAYS" | "IF_PREVIOUS_OPENED" | "IF_PREVIOUS_NOT_OPENED" | "IF_PREVIOUS_CLICKED";
export type CampaignEmailStatus = "PENDING" | "SENDING" | "SENT" | "FAILED";

export const CONDITION_LABELS: Record<ConditionType, string> = {
  ALWAYS: "Always send",
  IF_PREVIOUS_OPENED: "If previous email was opened",
  IF_PREVIOUS_NOT_OPENED: "If previous email was not opened",
  IF_PREVIOUS_CLICKED: "If previous email was clicked",
};

export type CampaignEmail = {
  id: string;
  campaign: string;
  sequence_number: number;
  email_template: string | null;
  email_template_name: string | null;
  subject: string;
  preview_text: string;
  from_name: string;
  reply_to: string | null;
  send_delay_type: SendDelayType;
  send_delay_hours: number | null;
  send_delay_days: number | null;
  condition_type: ConditionType;
  status: CampaignEmailStatus;
  sent_at: string | null;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  created_at: string;
};

export type TalentNetworkAudienceFilter = {
  tn_role_categories: string[];
  tn_industries: string[];
  tn_years_experience: string[];
  tn_work_type: string;
};

export type EmailCampaign = {
  id: string;
  name: string;
  audience_pool: CampaignAudiencePool;
  audience_type: CampaignAudienceType | null;
  audience_segment: string | null;
  audience_segment_name: string | null;
  audience_tag: string | null;
  audience_tag_name: string | null;
  manual_organisation_ids: number[];
  tn_role_categories: string[];
  tn_industries: string[];
  tn_years_experience: string[];
  tn_work_type: string;
  status: CampaignStatus;
  schedule_type: CampaignScheduleType;
  scheduled_for: string | null;
  sent_at: string | null;
  created_by_admin: number | null;
  created_at: string;
  updated_at: string;
  recipient_count: number;
  emails: CampaignEmail[];
};

export type AudiencePreview = {
  total_organisations: number | null;
  estimated_recipients: number;
  excluded_unsubscribed: number;
  sample_recipients: { company_id?: number; company_name?: string; email: string; name: string }[];
};

export type CampaignEmailBreakdown = {
  campaign_email_id: string;
  sequence_number: number;
  subject: string;
  status: CampaignEmailStatus;
  total_sent: number;
  delivered: number;
  open_rate_pct: number;
  click_rate_pct: number;
};

export type CampaignAnalytics = {
  by_email: CampaignEmailBreakdown[];
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
      return { type: "DIVIDER", colour: "#E0E0E0" };
    case "SPACER":
      return { type: "SPACER", height: "medium" };
    case "STAT":
      return { type: "STAT", label: "Stat label", merge_tag: MERGE_TAGS[0].tag };
    case "FOOTER":
      return { type: "FOOTER", company_name: "Tiaago", address: "", privacy_url: "https://www.tiaago.com/privacy-policy", social_links: [] };
  }
};
