import { Badge } from "@/app/common/components/ui/badge";
import { StaffMemberStatus } from "@/app/common/services/staff";

const VARIANT: Record<StaffMemberStatus, "success" | "destructive" | "secondary"> = {
  ACTIVE: "success",
  INACTIVE: "destructive",
  PENDING: "secondary",
};

const StaffStatusBadge = ({ status }: { status: StaffMemberStatus }) => (
  <Badge variant={VARIANT[status]}>{status}</Badge>
);

export default StaffStatusBadge;
