"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

import { cn } from "@/app/common/utils";
import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { NotificationItem } from "@/app/common/types/notifications.type";
import NotificationTypeIcon from "./NotificationTypeIcon";

const POLL_INTERVAL_MS = 60000;

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

const NotificationBell = ({ viewAllHref = "/notifications" }: { viewAllHref?: string }) => {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const data = await clientKyInstance.get("notifications/unread-count/").json<{ unread_count: number }>();
      setUnreadCount(data.unread_count);
    } catch {
      // Silent -- the bell just won't show a badge this cycle.
    }
  };

  const fetchRecent = async () => {
    setLoading(true);
    try {
      const data = await clientKyInstance
        .get("notifications/", { searchParams: { page: 1, page_size: 10 } })
        .json<{ results: NotificationItem[] }>();
      setNotifications(data.results);
    } catch {
      // Silent -- dropdown just shows empty state.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    // The full /notifications page marks notifications read independently
    // of this component (it lives in the persistent Nav, so a page-level
    // router.refresh() there doesn't touch this state) -- resync on its cue.
    window.addEventListener("notifications:updated", fetchUnreadCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications:updated", fetchUnreadCount);
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchRecent();
  };

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await clientKyInstance.post(`notifications/${id}/mark-read/`);
      window.dispatchEvent(new Event("notifications:updated"));
    } catch {
      // Best-effort -- local state already optimistically updated.
    }
  };

  const handleRowClick = (notification: NotificationItem) => {
    if (!notification.is_read) markRead(notification.id);
    if (notification.link_url) {
      window.location.href = notification.link_url;
      return;
    }
    setExpandedId(prev => (prev === notification.id ? null : notification.id));
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await clientKyInstance.post("notifications/mark-all-read/");
      window.dispatchEvent(new Event("notifications:updated"));
    } catch {
      // Best-effort.
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative text-2xl text-gray-500 hover:text-gray-700"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-semibold leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white rounded-lg shadow-lg border border-[#EAECEE] z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAECEE]">
            <p className="font-semibold text-sm text-primary-black">Notifications</p>
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              Mark all as read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="py-8 text-center text-sm text-secondary-black">Loading…</p>
            ) : notifications.length ? (
              notifications.map(notification => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleRowClick(notification)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left border-b border-[#F3F4F6] hover:bg-gray-50 relative",
                    !notification.is_read && "bg-primary/[0.03]"
                  )}
                >
                  {!notification.is_read && (
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  )}
                  <NotificationTypeIcon type={notification.type} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", !notification.is_read ? "font-semibold text-primary-black" : "font-medium text-primary-black")}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-secondary-black mt-0.5">
                      {expandedId === notification.id ? notification.message : truncate(notification.message, 80)}
                    </p>
                    <p className="text-[11px] text-secondary-black/70 mt-1">
                      {formatDistanceToNowStrict(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-secondary-black">No notifications yet</p>
            )}
          </div>

          <Link
            href={viewAllHref}
            onClick={() => setOpen(false)}
            className="block text-center py-3 text-xs font-medium text-primary hover:underline border-t border-[#EAECEE]"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
