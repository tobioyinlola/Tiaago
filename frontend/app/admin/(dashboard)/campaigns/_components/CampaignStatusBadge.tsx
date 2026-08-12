import { CampaignStatus } from "@/app/common/types/campaigns.type";

// Brand colors are scoped here too: green (#1D9E75) is reserved for CTAs,
// positive metric highlights, and the logo accent -- never a badge
// background -- so SENT uses it only as text on a neutral chip.
const STATUS_STYLES: Record<CampaignStatus, { bg: string; text: string }> = {
  DRAFT: { bg: "#F4F4F4", text: "#9E9E9E" },
  SCHEDULED: { bg: "#EAF0F6", text: "#1A3C5E" },
  SENDING: { bg: "#EAF0F6", text: "#1A3C5E" },
  SENT: { bg: "#F4F4F4", text: "#1D9E75" },
  CANCELLED: { bg: "#FDECEC", text: "#B42318" },
  PAUSED: { bg: "#F4F4F4", text: "#444444" },
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  SENDING: "Sending",
  SENT: "Sent",
  CANCELLED: "Cancelled",
  PAUSED: "Paused",
};

const CampaignStatusBadge = ({ status }: { status: CampaignStatus }) => {
  const style = STATUS_STYLES[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
};

export default CampaignStatusBadge;
