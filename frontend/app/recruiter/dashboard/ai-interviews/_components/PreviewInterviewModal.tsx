"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Sparkles } from "lucide-react";

import DaisyButton from "@/app/common/components/DaisyButton";
import Modal from "@/app/common/components/Modal";
import {
  getEligiblePreviewJobs,
  triggerAIInterviewPreview,
  type EligiblePreviewJob,
} from "@/app/common/services/ai-interviews";

const PreviewInterviewModal = () => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const [jobs, setJobs] = useState<EligiblePreviewJob[] | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");

  const open = async () => {
    modalRef.current?.showModal();
    setJoinUrl("");
    setLoading(true);
    const res = await getEligiblePreviewJobs();
    setLoading(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setJobs(res.data.results);
    setSelected(res.data.results[0]?.job_id ? String(res.data.results[0].job_id) : "");
  };

  const handleTrigger = async () => {
    if (!selected) return;
    setTriggering(true);
    const res = await triggerAIInterviewPreview(selected);
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
        Preview candidate experience
      </DaisyButton>

      <Modal id="preview-interview-modal" modalRef={modalRef}>
        <div className="bg-white rounded-xl p-6">
          <h3 className="text-lg font-bold text-primaryBlack mb-1">See what a candidate would see</h3>
          <p className="text-sm text-secondary-black mb-5">
            Generates a join link for one of your AI-interview-enabled jobs -- no candidate attached, nothing
            billed, no emails sent. Join it yourself, talk to Alex, and end it whenever you&apos;re done.
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : !jobs || jobs.length === 0 ? (
            <p className="text-sm text-secondary-black py-4">
              No jobs have AI interview enabled yet. Turn it on in the job wizard&apos;s Criteria &amp;
              Availability step.
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
                {jobs.map(job => (
                  <option key={job.job_id} value={job.job_id}>
                    {job.job_title}
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

export default PreviewInterviewModal;
