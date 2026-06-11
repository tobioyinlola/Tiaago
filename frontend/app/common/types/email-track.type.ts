export type EmailDeliveryStatus =
  | "pending"
  | "scheduled"
  | "sent"
  | "delayed"
  | "delivered"
  | "bounced"
  | "complained"
  | "suppressed"
  | "failed"
  | "mailgun_sent";

export const EMAIL_DELIVERY_STATUSES: EmailDeliveryStatus[] = [
  "pending",
  "scheduled",
  "sent",
  "delayed",
  "delivered",
  "bounced",
  "complained",
  "suppressed",
  "failed",
  "mailgun_sent",
];

export type EmailTrack = {
  id: number;
  email: string;
  email_type: string;
  status: string | number;
  delivery_status: EmailDeliveryStatus;
  provider_message_id: string;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
};

export type EmailTrackStats = {
  sent_24h: number;
  delivered_rate_7d: number;
  bounced_7d: number;
  complained_7d: number;
  email_types: string[];
};
