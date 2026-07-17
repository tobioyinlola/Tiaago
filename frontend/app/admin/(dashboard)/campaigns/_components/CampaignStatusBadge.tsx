import { CampaignStatus } from "@/app/common/types/campaigns.type";

const STATUS_CLASSES: Record<CampaignStatus, string> = {
  DRAFT: "badge-ghost",
  SCHEDULED: "badge-info",
  SENDING: "badge-warning",
  SENT: "badge-success",
  CANCELLED: "badge-error",
  PAUSED: "badge-warning",
};

const CampaignStatusBadge = ({ status }: { status: CampaignStatus }) => (
  <span className={`badge ${STATUS_CLASSES[status]}`}>{status}</span>
);

export default CampaignStatusBadge;
