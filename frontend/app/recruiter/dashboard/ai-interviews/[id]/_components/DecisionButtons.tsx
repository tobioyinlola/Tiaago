"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import DaisyButton from "@/app/common/components/DaisyButton";
import Modal from "@/app/common/components/Modal";
import { ID } from "@/app/common/types";
import { submitAIInterviewDecision, type AIInterviewDetail } from "@/app/common/services/ai-interviews";

const DECISION_LABEL: Record<NonNullable<AIInterviewDetail["recruiter_decision"]>, string> = {
  ACCEPTED: "Accepted -- invited to human interview",
  OVERRIDDEN_PROCEED: "Overridden -- proceeding anyway",
  OVERRIDDEN_DECLINE: "Overridden -- declined",
  PENDING: "",
};

const DecisionButtons = ({
  interviewId,
  interview,
  onDecided,
}: {
  interviewId: ID;
  interview: AIInterviewDetail;
  onDecided: (interview: AIInterviewDetail) => void;
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [pendingOverride, setPendingOverride] = useState<"OVERRIDDEN_PROCEED" | "OVERRIDDEN_DECLINE" | null>(null);
  const [reason, setReason] = useState("");
  const modalRef = useRef<HTMLDialogElement>(null);

  const submitDecision = async (decision: "ACCEPTED" | "OVERRIDDEN_PROCEED" | "OVERRIDDEN_DECLINE", override_reason?: string) => {
    setSubmitting(true);
    const res = await submitAIInterviewDecision(interviewId, { decision, override_reason });
    setSubmitting(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Decision submitted");
    onDecided(res.data);
    setPendingOverride(null);
    setReason("");
    modalRef.current?.close();
  };

  const openOverride = (decision: "OVERRIDDEN_PROCEED" | "OVERRIDDEN_DECLINE") => {
    setPendingOverride(decision);
    modalRef.current?.showModal();
  };

  if (interview.recruiter_decision && interview.recruiter_decision !== "PENDING") {
    return (
      <div className='rounded-xl bg-[#F5F6F7] px-4 py-3 text-sm text-primaryBlack font-medium'>
        {DECISION_LABEL[interview.recruiter_decision]}
        {interview.recruiter_override_reason && (
          <p className='text-xs text-secondary-black font-normal mt-1'>&ldquo;{interview.recruiter_override_reason}&rdquo;</p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className='flex flex-wrap gap-3'>
        <DaisyButton color='success' className='text-white' disabled={submitting} onClick={() => submitDecision("ACCEPTED")}>
          Invite to human interview
        </DaisyButton>
        <DaisyButton color='warning' variant='outline' disabled={submitting} onClick={() => openOverride("OVERRIDDEN_PROCEED")}>
          Override -- proceed anyway
        </DaisyButton>
        <DaisyButton color='error' variant='outline' disabled={submitting} onClick={() => openOverride("OVERRIDDEN_DECLINE")}>
          Decline candidate
        </DaisyButton>
      </div>

      <Modal id='ai-interview-override-modal' modalRef={modalRef}>
        <div className='bg-white rounded-xl p-6'>
          <h3 className='text-lg font-bold text-primaryBlack mb-1'>
            {pendingOverride === "OVERRIDDEN_DECLINE" ? "Decline candidate" : "Override -- proceed anyway"}
          </h3>
          <p className='text-sm text-secondary-black mb-4'>
            A written reason is required so this override is recorded on the candidate&apos;s file.
          </p>
          <textarea
            value={reason}
            onChange={event => setReason(event.target.value)}
            rows={4}
            className='textarea textarea-bordered w-full text-sm'
            placeholder='Why are you overriding Alex&apos;s recommendation?'
          />
          <div className='flex items-center justify-end gap-3 mt-5'>
            <DaisyButton color='neutral' variant='outline' onClick={() => modalRef.current?.close()}>
              Cancel
            </DaisyButton>
            <DaisyButton
              color={pendingOverride === "OVERRIDDEN_DECLINE" ? "error" : "warning"}
              className='text-white'
              disabled={!reason.trim() || submitting}
              onClick={() => pendingOverride && submitDecision(pendingOverride, reason.trim())}
            >
              Confirm
            </DaisyButton>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DecisionButtons;
