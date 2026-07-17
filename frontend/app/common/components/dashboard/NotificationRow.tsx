"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";

import { cn } from "@/app/common/utils";
import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { NotificationItem } from "@/app/common/types/notifications.type";
import NotificationTypeIcon from "./NotificationTypeIcon";

const NotificationRow = ({ notification }: { notification: NotificationItem }) => {
  const router = useRouter();
  const [isRead, setIsRead] = useState(notification.is_read);

  // Server refresh (e.g. after "mark all as read") delivers a new `is_read`
  // prop to this already-mounted row -- resync local state to it during
  // render rather than an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [syncedIsRead, setSyncedIsRead] = useState(notification.is_read);
  if (notification.is_read !== syncedIsRead) {
    setSyncedIsRead(notification.is_read);
    setIsRead(notification.is_read);
  }

  const handleClick = async () => {
    if (!isRead) {
      setIsRead(true);
      clientKyInstance
        .post(`notifications/${notification.id}/mark-read/`)
        .then(() => window.dispatchEvent(new Event("notifications:updated")))
        .catch(() => {});
      router.refresh();
    }
    if (notification.link_url) window.location.href = notification.link_url;
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      className={cn(
        "flex items-start gap-3 px-4 py-4 text-left cursor-pointer hover:bg-gray-50",
        !isRead && "border-l-4 border-l-primary bg-primary/[0.02]"
      )}
    >
      <NotificationTypeIcon type={notification.type} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", !isRead ? "font-semibold" : "font-medium", "text-primary-black")}>
          {notification.title}
        </p>
        <p className="text-sm text-secondary-black mt-1 whitespace-pre-line">{notification.message}</p>
        {notification.link_url && (
          <span className="inline-block mt-2 text-sm text-primary hover:underline">
            {notification.link_label || "View"} →
          </span>
        )}
        <p
          className="text-xs text-secondary-black/70 mt-2"
          title={format(new Date(notification.created_at), "MMM dd, yyyy hh:mm a")}
        >
          {formatDistanceToNowStrict(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      {!isRead && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" aria-hidden />}
    </div>
  );
};

export default NotificationRow;
