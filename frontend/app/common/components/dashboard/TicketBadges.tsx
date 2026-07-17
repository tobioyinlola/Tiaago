import { cn } from "@/app/common/utils";
import { TicketStatus, TicketPriority, TicketCategory } from "@/app/common/types/support.type";

const statusClassMap: Record<TicketStatus, string> = {
  OPEN: "bg-badge-blue-bg text-badge-blue-text",
  IN_PROGRESS: "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]",
  RESOLVED: "bg-badge-green-bg text-badge-green-text",
  CLOSED: "bg-muted text-muted-foreground",
};

const statusLabelMap: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const TicketStatusBadge = ({ status }: { status: TicketStatus }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
      statusClassMap[status]
    )}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
    {statusLabelMap[status]}
  </span>
);

const priorityClassMap: Record<TicketPriority, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-badge-blue-bg text-badge-blue-text",
  HIGH: "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]",
  URGENT: "bg-destructive/10 text-destructive",
};

const priorityLabelMap: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const TicketPriorityBadge = ({ priority }: { priority: TicketPriority }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
      priorityClassMap[priority]
    )}
  >
    {priorityLabelMap[priority]}
  </span>
);

const categoryLabelMap: Record<TicketCategory, string> = {
  BILLING: "Billing",
  TECHNICAL: "Technical issue",
  ACCOUNT: "Account and access",
  ASSESSMENTS: "Assessments",
  PIPELINE: "Pipeline",
  OTHER: "Other",
};

export const TicketCategoryBadge = ({ category }: { category: TicketCategory }) => (
  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground whitespace-nowrap">
    {categoryLabelMap[category]}
  </span>
);
