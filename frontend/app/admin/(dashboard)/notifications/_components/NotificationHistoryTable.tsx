"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/app/common/utils";
import clientKyInstance from "@/app/common/utils/client-ky.instance";
import NotificationTypeIcon from "@/app/common/components/dashboard/NotificationTypeIcon";
import { NotificationHistoryItem, NotificationHistoryDetail } from "@/app/common/types/notifications.type";

const NotificationHistoryTable = ({ notifications }: { notifications: NotificationHistoryItem[] }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<NotificationHistoryDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setLoading(true);
    try {
      const data = await clientKyInstance.get(`notifications/admin/${id}/`).json<NotificationHistoryDetail>();
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  if (!notifications.length) {
    return <p className="text-sm text-secondary-black py-8 text-center border rounded-lg">No notifications sent yet.</p>;
  }

  return (
    <div className="rounded-lg border border-[#EAECEE] divide-y divide-[#EAECEE]">
      {notifications.map(n => {
        const isExpanded = expandedId === n.id;
        return (
          <div key={n.id}>
            <button
              type="button"
              onClick={() => toggleExpand(n.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
            >
              <NotificationTypeIcon type={n.type} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary-black truncate">{n.title}</p>
                <p className="text-xs text-secondary-black">
                  {n.target_scope === "ALL_USERS"
                    ? "All users"
                    : n.target_scope === "SEGMENT"
                      ? `Segment: ${n.segment_name ?? "—"}`
                      : n.target_scope === "TAG"
                        ? `Tag: ${n.tag_name ?? "—"}`
                        : (n.target_organisation?.company_name ?? "Organisation")}
                  {" · "}
                  {n.read_count} / {n.recipients_count} read ({n.read_rate_pct}%)
                  {" · "}
                  {format(new Date(n.created_at), "MMM dd, yyyy")}
                  {n.sent_by_name ? ` · by ${n.sent_by_name}` : ""}
                </p>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-secondary-black shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-secondary-black shrink-0" />
              )}
            </button>
            {isExpanded && (
              <div className="px-4 pb-4">
                {loading ? (
                  <p className="text-sm text-secondary-black">Loading…</p>
                ) : detail ? (
                  <div className="rounded-md bg-gray-50 p-4 text-sm">
                    <p className="whitespace-pre-line text-primary-black mb-3">{detail.message}</p>
                    {detail.link_url && (
                      <p className="mb-3">
                        <span className="text-secondary-black">Link: </span>
                        <a href={detail.link_url} className="text-primary hover:underline">
                          {detail.link_label || detail.link_url}
                        </a>
                      </p>
                    )}
                    {detail.organisation_breakdown && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-secondary-black mb-2">
                          Organisation breakdown
                        </p>
                        <ul className="flex flex-col gap-1">
                          {detail.organisation_breakdown.map(org => (
                            <li key={org.company_id} className="flex items-center justify-between text-xs">
                              <span>{org.company_name}</span>
                              <span className={cn(org.opened > 0 ? "text-badge-green-text" : "text-secondary-black")}>
                                {org.opened} / {org.recipients} opened
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-secondary-black">Could not load details.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default NotificationHistoryTable;
