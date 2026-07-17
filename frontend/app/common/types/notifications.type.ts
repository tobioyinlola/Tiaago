export type NotificationType =
  | "ANNOUNCEMENT"
  | "MAINTENANCE"
  | "FEATURE_UPDATE"
  | "BILLING_ALERT"
  | "GENERAL";

export type TargetScope = "ALL_USERS" | "ORGANISATION" | "SEGMENT" | "TAG";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link_url: string | null;
  link_label: string | null;
  created_at: string;
  is_read: boolean;
};

export type NotificationHistoryItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link_url: string | null;
  link_label: string | null;
  target_scope: TargetScope;
  target_organisation: { id: number; company_name: string } | null;
  segment_name: string | null;
  tag_name: string | null;
  sent_by_name: string | null;
  recipients_count: number;
  read_count: number;
  read_rate_pct: number;
  created_at: string;
};

export type NotificationHistoryDetail = NotificationHistoryItem & {
  organisation_breakdown:
    | { company_id: number; company_name: string; recipients: number; opened: number }[]
    | null;
};

export type OrganisationOption = {
  id: number;
  company_name: string;
};
