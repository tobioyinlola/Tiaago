"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight } from "lucide-react";

import DaisyButton from "@/app/common/components/DaisyButton";
import NotificationTypeIcon from "@/app/common/components/dashboard/NotificationTypeIcon";
import AudiencePicker, { AudienceValue } from "@/app/common/components/dashboard/AudiencePicker";
import { sendNotification } from "@/app/common/services/notifications";
import { NotificationType } from "@/app/common/types/notifications.type";
import PermissionGuard from "../../components/PermissionGuard";

const TYPE_OPTIONS: { value: NotificationType; label: string }[] = [
  { value: "ANNOUNCEMENT", label: "Announcement" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "FEATURE_UPDATE", label: "Feature Update" },
  { value: "BILLING_ALERT", label: "Billing Alert" },
  { value: "GENERAL", label: "General" },
];

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

const NotificationComposeForm = () => {
  const router = useRouter();
  const [type, setType] = useState<NotificationType>("ANNOUNCEMENT");
  const [audience, setAudience] = useState<AudienceValue>({ type: "ALL_USERS" });
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ title: string; recipient_count: number } | null>(null);

  const reset = () => {
    setType("ANNOUNCEMENT");
    setAudience({ type: "ALL_USERS" });
    setTitle("");
    setMessage("");
    setLinkUrl("");
    setLinkLabel("");
  };

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    if (audience.type === "ORGANISATION" && !audience.organisation) {
      toast.error("Select an organisation to target.");
      return;
    }
    if (audience.type === "SEGMENT" && !audience.segment_id) {
      toast.error("Select a segment to target.");
      return;
    }
    if (audience.type === "TAG" && !audience.tag_id) {
      toast.error("Select a tag to target.");
      return;
    }
    setSubmitting(true);
    const result = await sendNotification({
      type,
      title: title.trim(),
      message: message.trim(),
      link_url: linkUrl.trim() || undefined,
      link_label: linkLabel.trim() || undefined,
      target_scope: audience.type as "ALL_USERS" | "ORGANISATION" | "SEGMENT" | "TAG",
      target_organisation: audience.type === "ORGANISATION" ? audience.organisation?.id : undefined,
      segment: audience.type === "SEGMENT" ? audience.segment_id ?? undefined : undefined,
      tag: audience.type === "TAG" ? audience.tag_id ?? undefined : undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setSuccess({ title: result.data.title, recipient_count: result.data.recipient_count });
    reset();
    router.refresh();
  };

  if (success) {
    return (
      <div className="rounded-lg border border-[#EAECEE] bg-white p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mb-5">
          <CheckCircle2 className="h-7 w-7 text-success" />
        </div>
        <h3 className="text-lg font-bold text-primary-black font-space-grotesk mb-1">
          &quot;{success.title}&quot; has been sent
        </h3>
        <p className="text-secondary-black mb-6">Delivered to {success.recipient_count} recipient(s).</p>
        <DaisyButton color="primary" className="text-white" onClick={() => setSuccess(null)}>
          Send another notification
        </DaisyButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-[#EAECEE] bg-white p-6 flex flex-col gap-5">
        <div>
          <label className="label-text text-black font-medium font-onest mb-1 block">Type</label>
          <select
            className="select select-bordered w-full"
            value={type}
            onChange={e => setType(e.target.value as NotificationType)}
          >
            {TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-text text-black font-medium font-onest mb-2 block">Target audience</label>
          <AudiencePicker options={["ALL_USERS", "SEGMENT", "TAG", "ORGANISATION"]} value={audience} onChange={setAudience} />
        </div>

        <div>
          <label className="label-text text-black font-medium font-onest mb-1 block">Title</label>
          <input
            type="text"
            maxLength={80}
            className="input input-bordered w-full"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <p className="text-xs text-secondary-black text-right mt-1">{title.length}/80</p>
        </div>

        <div>
          <label className="label-text text-black font-medium font-onest mb-1 block">Message</label>
          <textarea
            className="textarea textarea-bordered w-full min-h-[120px]"
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <p className="text-xs text-secondary-black text-right mt-1">{message.length} characters</p>
        </div>

        <div>
          <label className="label-text text-black font-medium font-onest mb-1 block">Link (optional)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Link URL"
              className="input input-bordered w-full"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
            />
            {!!linkUrl && (
              <input
                type="text"
                placeholder='Link label, e.g. "View update"'
                className="input input-bordered w-full"
                value={linkLabel}
                onChange={e => setLinkLabel(e.target.value)}
              />
            )}
          </div>
        </div>

        <PermissionGuard
          permission="notifications.send"
          fallback={<p className="text-sm text-muted-foreground">You don&apos;t have permission to send notifications.</p>}
        >
          <DaisyButton
            color="primary"
            className="text-white w-full sm:w-auto px-10"
            onClick={handleSubmit}
            loading={submitting}
          >
            {submitting ? "" : "Send notification"}
          </DaisyButton>
        </PermissionGuard>
      </div>

      {/* Live preview */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary-black mb-2">Preview</p>
        <div className="rounded-lg border border-[#EAECEE] bg-white shadow-sm w-full max-w-96">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAECEE]">
            <p className="font-semibold text-sm text-primary-black">Notifications</p>
          </div>
          <div className="flex items-start gap-3 px-4 py-3 bg-primary/[0.03]">
            <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" aria-hidden />
            <NotificationTypeIcon type={type} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary-black">{title || "Notification title"}</p>
              <p className="text-xs text-secondary-black mt-0.5">
                {truncate(message || "Your message preview will appear here.", 80)}
              </p>
              {!!linkUrl && (
                <p className="text-xs text-primary mt-1 flex items-center gap-1">
                  {linkLabel || "View"} <ArrowRight className="h-3 w-3" />
                </p>
              )}
              <p className="text-[11px] text-secondary-black/70 mt-1">just now</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationComposeForm;
