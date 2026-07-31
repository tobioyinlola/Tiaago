"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Paperclip, Lock } from "lucide-react";

import { cn } from "@/app/common/utils";
import DaisyButton from "@/app/common/components/DaisyButton";
import FileDropzone from "@/app/common/components/dashboard/FileDropzone";
import { replyToTicket, reopenTicket } from "@/app/common/services/support";
import { TicketDetail } from "@/app/common/types/support.type";

const Initials = ({ name }: { name: string }) => {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join("");
  return (
    <div className="w-8 h-8 rounded-full bg-gray-400/80 text-white flex items-center justify-center text-xs font-semibold shrink-0">
      {initials || "?"}
    </div>
  );
};

const AttachmentLink = ({ attachment }: { attachment: TicketDetail["attachments"][number] }) => (
  <a
    href={attachment.file_url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
  >
    <Paperclip className="h-3.5 w-3.5" />
    {attachment.file_name}
  </a>
);

const TicketThread = ({ ticket }: { ticket: TicketDetail }) => {
  const router = useRouter();
  const [replyMessage, setReplyMessage] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [reopening, setReopening] = useState(false);

  const canReply = ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";

  const handleReply = async () => {
    if (replyMessage.trim().length < 1) {
      toast.error("Write a message before sending.");
      return;
    }
    setSubmitting(true);
    const result = await replyToTicket(ticket.id, replyMessage.trim(), replyFiles);
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setReplyMessage("");
    setReplyFiles([]);
    router.refresh();
  };

  const handleReopen = async () => {
    setReopening(true);
    const result = await reopenTicket(ticket.id);
    setReopening(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Ticket reopened.");
    router.refresh();
  };

  return (
    <div className="max-w-3xl">
      {ticket.status === "RESOLVED" && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-badge-green-bg bg-badge-green-bg/40 px-4 py-3 mb-6 flex-wrap">
          <p className="text-sm text-badge-green-text font-medium">
            This ticket has been marked as resolved. If your issue is not fixed, you can reopen it.
          </p>
          <DaisyButton onClick={handleReopen} loading={reopening} className="btn-sm">
            Reopen ticket
          </DaisyButton>
        </div>
      )}

      <div className="flex flex-col gap-4 mb-6">
        {/* Original message */}
        <div className="flex items-start gap-3">
          <Initials name={ticket.submitted_by?.name ?? "You"} />
          <div className="max-w-[85%]">
            <div className="rounded-lg rounded-tl-none bg-gray-100 px-4 py-3">
              <p className="text-xs font-medium text-secondary-black mb-1">{ticket.submitted_by?.name ?? "You"}</p>
              <p className="text-sm text-primary-black whitespace-pre-line">{ticket.message}</p>
            </div>
            {!!ticket.attachments.length && (
              <div className="flex flex-col gap-1 mt-2 ml-1">
                {ticket.attachments.map(a => (
                  <AttachmentLink key={a.id} attachment={a} />
                ))}
              </div>
            )}
            <p className="text-[11px] text-secondary-black mt-1 ml-1">
              {formatDistanceToNowStrict(new Date(ticket.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Replies */}
        {ticket.replies.map(reply => {
          if (reply.is_internal_note) return null; // never shown to users
          const isAdmin = reply.is_admin_reply;
          return (
            <div key={reply.id} className={cn("flex items-start gap-3", isAdmin && "flex-row-reverse")}>
              {!isAdmin && <Initials name={reply.sent_by?.name ?? "You"} />}
              <div className="max-w-[85%]">
                <div
                  className={cn(
                    "rounded-lg px-4 py-3",
                    isAdmin
                      ? "rounded-tr-none bg-primary text-white"
                      : "rounded-tl-none bg-gray-100 text-primary-black"
                  )}
                >
                  <p className={cn("text-xs font-medium mb-1", isAdmin ? "text-white/80" : "text-secondary-black")}>
                    {isAdmin ? "Tiaago Support" : reply.sent_by?.name ?? "You"}
                  </p>
                  <p className="text-sm whitespace-pre-line">{reply.message}</p>
                </div>
                {!!reply.attachments.length && (
                  <div className={cn("flex flex-col gap-1 mt-2 mx-1", isAdmin && "items-end")}>
                    {reply.attachments.map(a => (
                      <AttachmentLink key={a.id} attachment={a} />
                    ))}
                  </div>
                )}
                <p className={cn("text-[11px] text-secondary-black mt-1 mx-1", isAdmin && "text-right")}>
                  {format(new Date(reply.created_at), "MMM dd, yyyy hh:mm a")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {canReply ? (
        <div className="rounded-lg border border-[#EAECEE] bg-white p-4">
          <textarea
            value={replyMessage}
            onChange={e => setReplyMessage(e.target.value)}
            placeholder="Write a reply..."
            className="textarea textarea-bordered w-full min-h-[100px] mb-3"
          />
          <FileDropzone files={replyFiles} onChange={setReplyFiles} className="mb-3" />
          <DaisyButton color="primary" className="text-white" onClick={handleReply} loading={submitting}>
            {submitting ? "" : "Send reply"}
          </DaisyButton>
        </div>
      ) : (
        ticket.status === "CLOSED" && (
          <p className="text-sm text-secondary-black flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" /> This ticket is closed and no longer accepting replies.
          </p>
        )
      )}
    </div>
  );
};

export default TicketThread;
