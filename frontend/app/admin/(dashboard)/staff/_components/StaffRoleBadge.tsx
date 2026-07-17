import { Badge } from "@/app/common/components/ui/badge";
import { cn } from "@/app/common/utils";

// Distinct colour per system role, per design spec. Roles beyond the 6
// system roles (custom roles an admin creates) fall back to `outline`.
const ROLE_CLASSNAMES: Record<string, string> = {
  super_admin: "border-transparent bg-red-100 text-red-700",
  operations_manager: "border-transparent bg-blue-950/10 text-blue-950",
  support_agent: "border-transparent bg-badge-blue-bg text-badge-blue-text",
  marketing_manager: "border-transparent bg-badge-purple-bg text-badge-purple-text",
  finance: "border-transparent bg-badge-green-bg text-badge-green-text",
  read_only: "border-transparent bg-gray-100 text-gray-600",
};

const StaffRoleBadge = ({ role }: { role: { name: string; slug: string } | null }) => {
  if (!role) {
    return <Badge variant='outline'>No role</Badge>;
  }
  const className = ROLE_CLASSNAMES[role.slug];
  return (
    <Badge variant={className ? undefined : "outline"} className={cn(className)}>
      {role.name}
    </Badge>
  );
};

export default StaffRoleBadge;
