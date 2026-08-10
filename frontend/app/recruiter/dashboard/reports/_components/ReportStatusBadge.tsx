import { cn } from "@/app/common/utils";
import { ReportStatus } from "@/app/common/types/reports.type";

const STATUS_BADGE_STYLES: Record<ReportStatus, string> = {
  GENERATING: "bg-[#FFFAEB] text-[#B54708]",
  READY: "bg-[#ECFDF3] text-[#027A48]",
  FAILED: "bg-[#FFEDED] text-[#B53535]",
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  GENERATING: "Generating",
  READY: "Ready",
  FAILED: "Failed",
};

const ReportStatusBadge = ({ status }: { status: ReportStatus }) => (
  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap", STATUS_BADGE_STYLES[status])}>
    {STATUS_LABELS[status]}
  </span>
);

export default ReportStatusBadge;
