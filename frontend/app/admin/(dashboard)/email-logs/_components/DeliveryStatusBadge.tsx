import { cn } from "@/app/common/utils";
import { EmailDeliveryStatus } from "@/app/common/types/email-track.type";

const statusClassMap: Record<EmailDeliveryStatus, string> = {
  delivered: "bg-badge-green-bg text-badge-green-text",
  sent: "bg-badge-blue-bg text-badge-blue-text",
  pending: "bg-badge-blue-bg text-badge-blue-text",
  scheduled: "bg-badge-blue-bg text-badge-blue-text",
  delayed: "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]",
  bounced: "bg-destructive/10 text-destructive",
  complained: "bg-destructive/10 text-destructive",
  failed: "bg-destructive/10 text-destructive",
  suppressed: "bg-muted text-muted-foreground",
  mailgun_sent: "bg-muted text-muted-foreground",
};

const DeliveryStatusBadge = ({ status }: { status: EmailDeliveryStatus }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize whitespace-nowrap",
        statusClassMap[status] ?? "bg-muted text-muted-foreground"
      )}
    >
      <span className='h-1.5 w-1.5 rounded-full bg-current' aria-hidden />
      {status.replaceAll("_", " ")}
    </span>
  );
};

export default DeliveryStatusBadge;
