import CustomBadge from "./CustomBadge";

type StatusBadgeProps = {
  status:
    | "active"
    | "approved"
    | "inactive"
    | "pending"
    | "on_hold"
    | "completed"
    | "hired"
    | "expired"
    | "basic"
    | "pro"
    | "applied"
    | "reviewed"
    | "interview_scheduled"
    | "pending_decision"
    | "offer_extended"
    | "offer_accepted"
    | "offer_declined"
    | "rejected"
    | "failed"
    | "withdrawn"
    | "pending_confirmation"
    | "unsubscribed"
    | "deactivated";
  hideDot?: boolean;
};

const success = { bg: "#ECFDF3", color: "#027A48" };
const error = { bg: "#FEF3F2", color: "#B42318" };
const warning = error;
// const warning = { bg: "#FDE68A", color: "#FDE68A" };
const info = { bg: "#EFF8FF", color: "var(--primary)" };

const statusColorMap: Record<
  StatusBadgeProps["status"],
  { bg: string; color: string }
> = {
  active: success,
  approved: success,
  completed: success,
  pro: success,
  applied: success,
  offer_accepted: success,
  offer_extended: success,
  inactive: error,
  expired: error,
  offer_declined: error,
  rejected: error,
  failed: error,
  withdrawn: warning,
  pending: warning,
  on_hold: warning,
  pending_decision: warning,
  pending_confirmation: warning,
  unsubscribed: error,
  deactivated: error,
  basic: info,
  hired: info,
  reviewed: info,
  interview_scheduled: info,
};

const StatusBadge = ({ status, hideDot }: StatusBadgeProps) => {
  const { bg, color } =
    statusColorMap[status.toLowerCase() as StatusBadgeProps["status"]] ?? {};
  return (
    <CustomBadge
      style={{
        backgroundColor: bg,
        color: color,
      }}
      text={status.replaceAll("_", " ")}
      hideDot={hideDot}
      fill={color}
      className='capitalize font-medium whitespace-nowrap'
    />
  );
};

export default StatusBadge;
