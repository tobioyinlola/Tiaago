"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, Send } from "lucide-react";

import { ID, InterviewCandidateFeedbackData } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import { sendInterviewFeedback, updateInterviewFeedback } from "@/app/common/services/interview-review";

const MAX_CHARS = 3000;

const CandidateFeedbackSection = ({
  interviewId,
  feedback,
  hasCandidateEmail,
  candidateName,
  onFeedbackChange,
}: {
  interviewId: ID;
  feedback: InterviewCandidateFeedbackData | null;
  hasCandidateEmail: boolean;
  candidateName: string;
  onFeedbackChange: (feedback: InterviewCandidateFeedbackData) => void;
}) => {
  const [content, setContent] = useState(feedback?.content || "");
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const sent = feedback?.delivery_status === "SENT" || feedback?.delivery_status === "DELIVERED";

  const commit = async () => {
    if (sent || content === (feedback?.content || "")) return;
    setSaving(true);
    const res = await updateInterviewFeedback(interviewId, content);
    setSaving(false);
    if (res.success) onFeedbackChange(res.data);
  };

  const handleSend = async () => {
    setSending(true);
    const res = await sendInterviewFeedback(interviewId);
    setSending(false);
    setConfirmOpen(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Feedback sent to " + candidateName);
    onFeedbackChange(res.data);
  };

  return (
    <div className='border border-[#EAECF0] rounded-2lg p-5'>
      <div className='flex items-center justify-between mb-3'>
        <p className='text-sm font-semibold text-primaryBlack'>Candidate feedback</p>
        {sent && (
          <span className='text-[11px] font-medium text-success bg-success/10 rounded-full px-2 py-0.5'>
            Sent
          </span>
        )}
      </div>

      <textarea
        value={content}
        onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
        onBlur={commit}
        disabled={sent}
        rows={6}
        placeholder='Draft feedback for the candidate...'
        className={cn(
          "textarea textarea-bordered w-full text-sm",
          sent && "opacity-60 cursor-not-allowed"
        )}
      />
      <div className='flex items-center justify-between mt-2'>
        <span className='text-[11px] text-secondary-black'>
          {content.length}/{MAX_CHARS} {saving && "· Saving..."}
        </span>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => setPreviewOpen(true)}
            className='btn btn-xs btn-outline rounded-md gap-1'
          >
            <Eye className='w-3 h-3' /> Preview
          </button>
          {!sent && (
            <button
              type='button'
              onClick={() => setConfirmOpen(true)}
              disabled={!content.trim() || !hasCandidateEmail}
              className='btn btn-xs btn-primary text-white rounded-md gap-1'
            >
              <Send className='w-3 h-3' /> Send Feedback
            </button>
          )}
        </div>
      </div>
      {!hasCandidateEmail && !sent && (
        <p className='text-[11px] text-amber-600 mt-1'>This candidate has no email on file -- feedback can&apos;t be sent.</p>
      )}

      {previewOpen && (
        <div className='fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6' onClick={() => setPreviewOpen(false)}>
          <div
            className='bg-white rounded-2lg max-w-lg w-full max-h-[70vh] overflow-y-auto p-6'
            onClick={e => e.stopPropagation()}
          >
            <p className='text-xs font-semibold text-secondary-black uppercase tracking-wide mb-3'>
              Email preview
            </p>
            <p className='text-sm text-primaryBlack whitespace-pre-line'>{content}</p>
            <button
              type='button'
              onClick={() => setPreviewOpen(false)}
              className='btn btn-sm btn-outline rounded-lg w-full mt-4'
            >
              Close
            </button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className='fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6' onClick={() => setConfirmOpen(false)}>
          <div className='bg-white rounded-2lg max-w-sm w-full p-6' onClick={e => e.stopPropagation()}>
            <p className='text-sm font-semibold text-primaryBlack mb-2'>Send feedback to {candidateName}?</p>
            <p className='text-xs text-secondary-black mb-4'>
              This can&apos;t be edited or unsent once delivered.
            </p>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => setConfirmOpen(false)}
                className='btn btn-sm btn-outline rounded-lg flex-1'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleSend}
                disabled={sending}
                className='btn btn-sm btn-primary text-white rounded-lg flex-1'
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateFeedbackSection;
