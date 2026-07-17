import { Megaphone, Wrench, Sparkles, Wallet, Info, LucideIcon } from "lucide-react";

import { cn } from "@/app/common/utils";
import { NotificationType } from "@/app/common/types/notifications.type";

const ICON_MAP: Record<NotificationType, LucideIcon> = {
  ANNOUNCEMENT: Megaphone,
  MAINTENANCE: Wrench,
  FEATURE_UPDATE: Sparkles,
  BILLING_ALERT: Wallet,
  GENERAL: Info,
};

const COLOR_MAP: Record<NotificationType, string> = {
  ANNOUNCEMENT: "bg-badge-blue-bg text-badge-blue-text",
  MAINTENANCE: "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]",
  FEATURE_UPDATE: "bg-badge-green-bg text-badge-green-text",
  BILLING_ALERT: "bg-destructive/10 text-destructive",
  GENERAL: "bg-muted text-muted-foreground",
};

const NotificationTypeIcon = ({ type, className }: { type: NotificationType; className?: string }) => {
  const Icon = ICON_MAP[type] ?? Info;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full h-8 w-8 shrink-0",
        COLOR_MAP[type],
        className
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
};

export default NotificationTypeIcon;
