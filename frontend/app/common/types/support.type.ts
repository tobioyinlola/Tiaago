export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketCategory = "BILLING" | "TECHNICAL" | "ACCOUNT" | "ASSESSMENTS" | "PIPELINE" | "OTHER";

export type TicketAttachment = {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
};

export type TicketReplyUser = {
  id: number;
  name: string;
  email: string;
};

export type TicketReply = {
  id: string;
  sent_by: TicketReplyUser | null;
  is_admin_reply: boolean;
  is_internal_note: boolean;
  message: string;
  created_at: string;
  attachments: TicketAttachment[];
};

export type TicketListItem = {
  id: string;
  ticket_number: string;
  title: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
  reply_count: number;
};

export type AdminTicketListItem = TicketListItem & {
  company_id: number;
  company_name: string;
  submitted_by: TicketReplyUser;
  assigned_to: TicketReplyUser | null;
};

export type TicketDetail = {
  id: string;
  ticket_number: string;
  title: string;
  message: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  company_name: string;
  submitted_by: TicketReplyUser;
  assigned_to: TicketReplyUser | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  attachments: TicketAttachment[];
  replies: TicketReply[];
};
