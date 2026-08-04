"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Sparkles } from "lucide-react";

import DaisyButton from "@/app/common/components/DaisyButton";
import Modal from "@/app/common/components/Modal";
import {
  getEligibleAIInterviewApplications,
  triggerAIInterview,
  type EligibleAIInterviewApplication,
} from "@/app/common/services/ai-interviews";

const StartTestInterviewModal = () => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const [applications, setApplications] = useState<EligibleAIInterviewApplication[] | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");

  const open = async () => {
    modalRef.current?.showModal();
    setJoinUrl("");
    setLoading(true);
    const res = await getEligibleAIInterviewApplications();
    setLoading(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setApplications(res.data.results);
    setSelected(res.data.results[0]?.job_application_id ? String(res.data.results[0].job_application_id) : "");
  };

  const handleTrigger = async () => {
    if (!selected) return;
    setTriggering(true);
    const res = await triggerAIInterview(selected);
    setTriggering(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setJoinUrl(res.data.join_url);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    toast.success("Link copied");
  };

  return (
    <>
      <DaisyButton color="primary" className="text-white gap-1.5" onClick={open}>
        <Sparkles className="w-4 h-4" />
        Start test interview
      </DaisyButton>

      <Modal id="start-test-interview-modal" modalRef={modalRef}>
        <div className="bg-white rounded-xl p-6">
          <h3 className="text-lg font-bold text-primaryBlack mb-1">Start a test AI interview</h3>
          <p className="text-sm text-secondary-black mb-5">
            Generates a real join link for a candidate on one of your AI-interview-enabled jobs, without
            waiting for them to pass an assessment first.
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : !applications || applications.length === 0 ? (
            <p className="text-sm text-secondary-black py-4">
              No applications found on a job with AI interview enabled yet. Turn it on in the job wizard&apos;s
              Criteria &amp; Availability step, then have someone apply.
            </p>
          ) : (
            <>
              <select
                className="select select-bordered w-full text-sm mb-4"
                value={selected}
                onChange={event => {
                  setSelected(event.target.value);
                  setJoinUrl("");
                }}
              >
                {applications.map(application => (
                  <option key={application.job_application_id} value={application.job_application_id}>
                    {application.candidate_name} &middot; {application.job_title}
                    {application.already_has_interview ? " (already has an interview)" : ""}
                  </option>
                ))}
              </select>

              {joinUrl ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 rounded-lg border border-[#EAECF0] bg-[#F5F6F7] px-3 py-2">
                    <span className="text-xs text-primaryBlack truncate flex-1">{joinUrl}</span>
                    <button type="button" onClick={copyLink} aria-label="Copy link">
                      <Copy className="w-4 h-4 text-secondary-black hover:text-primary" />
                    </button>
                    <a href={joinUrl} target="_blank" rel="noreferrer" aria-label="Open link">
                      <ExternalLink className="w-4 h-4 text-secondary-black hover:text-primary" />
                    </a>
                  </div>
                  <DaisyButton color="primary" variant="outline" onClick={handleTrigger} disabled={triggering}>
                    Generate another
                  </DaisyButton>
                </div>
              ) : (
                <DaisyButton color="primary" className="text-white w-full" onClick={handleTrigger} loading={triggering}>
                  Generate join link
                </DaisyButton>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
};

export default StartTestInterviewModal;
