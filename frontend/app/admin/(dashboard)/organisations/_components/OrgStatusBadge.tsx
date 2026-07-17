import { cn } from "@/app/common/utils";
import { OrganisationStatus } from "@/app/common/types/analytics.type";

const statusClassMap: Record<OrganisationStatus, string> = {
  active: "bg-badge-green-bg text-badge-green-text",
  free_credits: "bg-badge-blue-bg text-badge-blue-text",
  dormant: "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]",
  churned: "bg-destructive/10 text-destructive",
};

const statusLabelMap: Record<OrganisationStatus, string> = {
  active: "Active",
  free_credits: "Free Credits",
  dormant: "Dormant",
  churned: "Churned",
};

const OrgStatusBadge = ({ status }: { status: OrganisationStatus }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        statusClassMap[status]
      )}
    >
      <span className='h-1.5 w-1.5 rounded-full bg-current' aria-hidden />
      {statusLabelMap[status]}
    </span>
  );
};

export default OrgStatusBadge;
