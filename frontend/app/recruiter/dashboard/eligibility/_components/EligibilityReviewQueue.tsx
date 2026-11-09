"use client";

import { useState } from "react";
import { CircleAlert, Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { ApplicationEligibilityCheck, JobApplication } from "@/app/common/types";
import {
  EligibilityReviewDecision,
  reviewApplicationEligibilityCheck,
} from "@/app/common/services/jobs";
import { cn } from "@/app/common/utils";

const pendingStatuses = new Set<ApplicationEligibilityCheck["status"]>(["PENDING", "NEEDS_REVIEW"]);

const statusMeta: Record<ApplicationEligibilityCheck["status"], { label: string; className: string }> = {
  PENDING: { label: "Declared — review needed", className: "bg-[#FFFAEB] text-[#B54708]" },
  PASS: { label: "Passed", className: "bg-[#ECFDF3] text-[#027A48]" },
  FAIL: { label: "Not met", className: "bg-[#FFEDED] text-[#B42318]" },
  NEEDS_REVIEW: { label: "Information needed", className: "bg-[#EFF4FF] text-[#3538CD]" },
  NOT_APPLICABLE: { label: "Not applicable", className: "bg-[#F2F4F7] text-[#475467]" },
};

type ReviewDraft = {
  status?: EligibilityReviewDecision;
  reason: string;
};

const declarationLabel = (declaration: boolean | null) => {
  if (declaration === true) return "Candidate declared they meet this requirement";
  if (declaration === false) return "Candidate declared they do not meet this requirement";
  return "No candidate declaration was collected";
};

const EligibilityReviewQueue = ({ initialApplications }: { initialApplications: JobApplication[] }) => {
  const [applications, setApplications] = useState(initialApplications);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [savingCheckId, setSavingCheckId] = useState<string | null>(null);

  const updateDraft = (checkId: string, patch: Partial<ReviewDraft>) => {
    setDrafts(current => ({
      ...current,
      [checkId]: { ...current[checkId], reason: current[checkId]?.reason || "", ...patch },
    }));
  };

  const saveReview = async (application: JobApplication, check: ApplicationEligibilityCheck) => {
    const checkId = String(check.id);
    const draft = drafts[checkId];
    if (!draft?.status) {
      toast.error("Select a review decision");
      return;
    }
    if ((draft.status === "FAIL" || draft.status === "NEEDS_REVIEW") && !draft.reason.trim()) {
      toast.error("Add a reason for this decision");
      return;
    }

    setSavingCheckId(checkId);
    const response = await reviewApplicationEligibilityCheck(
      application.id,
      check.id,
      draft.status,
      draft.reason.trim()
    );
    setSavingCheckId(null);
    if (!response.success) {
      toast.error(response.error || "Could not save the eligibility review");
      return;
    }
    if (!response.data) {
      toast.error("Could not save the eligibility review");
      return;
    }

    setApplications(current =>
      current
        .map(item => {
          if (item.id !== application.id) return item;
          const eligibilityChecks = (item.eligibility_checks || []).map(existing =>
            existing.id === response.data?.id ? response.data : existing
          );
          return { ...item, eligibility_checks: eligibilityChecks };
        })
        .filter(item => (item.eligibility_checks || []).some(itemCheck => pendingStatuses.has(itemCheck.status)))
    );
    setDrafts(current => {
      const next = { ...current };
      delete next[checkId];
      return next;
    });
    toast.success("Eligibility decision saved");
  };

  if (!applications.length) {
    return (
      <div className='flex flex-col items-center rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-6 py-14 text-center'>
        <ShieldCheck className='mb-3 h-10 w-10 text-success' />
        <h2 className='text-lg font-semibold text-primary-black'>No eligibility reviews waiting</h2>
        <p className='mt-1 max-w-md text-sm text-secondary-black'>
          New declaration-based checks will appear here for an authorised recruiter to review.
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      {applications.map(application => {
        const unresolvedChecks = (application.eligibility_checks || []).filter(check => pendingStatuses.has(check.status));
        return (
          <section key={application.id} className='rounded-2xl border border-[#EAECF0] bg-white p-5 shadow-sm'>
            <div className='flex flex-col justify-between gap-3 border-b border-[#EAECF0] pb-4 sm:flex-row sm:items-start'>
              <div>
                <h2 className='text-base font-semibold text-primary-black'>{application.applicant.name || "Candidate"}</h2>
                <p className='mt-0.5 text-sm text-secondary-black'>{application.applicant.email}</p>
              </div>
              <div className='rounded-lg bg-[#F9FAFB] px-3 py-2 text-sm'>
                <p className='font-medium text-primary-black'>{application.job.title}</p>
                <p className='text-secondary-black'>{application.company_name}</p>
              </div>
            </div>

            <div className='mt-4 flex flex-col gap-4'>
              {unresolvedChecks.map(check => {
                const checkId = String(check.id);
                const draft = drafts[checkId] || { reason: "" };
                const isSaving = savingCheckId === checkId;
                return (
                  <article key={check.id} className='rounded-xl border border-[#EAECF0] p-4'>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                      <div>
                        <div className='flex flex-wrap items-center gap-2'>
                          <h3 className='font-medium text-primary-black'>{check.requirement_label}</h3>
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusMeta[check.status].className)}>
                            {statusMeta[check.status].label}
                          </span>
                          {check.is_required && <span className='text-xs font-medium text-error'>Required</span>}
                        </div>
                        <p className='mt-1 text-sm text-secondary-black'>{check.requirement_description}</p>
                      </div>
                      <p className='flex shrink-0 items-center gap-1.5 text-xs text-secondary-black'>
                        <UserCheck className='h-3.5 w-3.5' /> {declarationLabel(check.declaration)}
                      </p>
                    </div>

                    <div className='mt-4 grid gap-3 md:grid-cols-[minmax(0,220px)_1fr_auto] md:items-end'>
                      <label className='flex flex-col gap-1.5 text-sm font-medium text-primary-black'>
                        Review decision
                        <select
                          value={draft.status || ""}
                          onChange={event => updateDraft(checkId, { status: event.target.value as EligibilityReviewDecision })}
                          disabled={isSaving}
                          className='h-10 rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm font-normal text-primary-black'
                        >
                          <option value=''>Select a decision</option>
                          <option value='PASS'>Pass — evidence reviewed</option>
                          <option value='FAIL'>Fail — requirement not met</option>
                          <option value='NEEDS_REVIEW'>Needs review — more information required</option>
                          <option value='NOT_APPLICABLE'>Not applicable</option>
                        </select>
                      </label>
                      <label className='flex flex-col gap-1.5 text-sm font-medium text-primary-black'>
                        Reason {draft.status === "FAIL" || draft.status === "NEEDS_REVIEW" ? "*" : "(optional)"}
                        <input
                          value={draft.reason}
                          onChange={event => updateDraft(checkId, { reason: event.target.value })}
                          disabled={isSaving}
                          maxLength={1000}
                          placeholder='Record the evidence reviewed or what is still needed'
                          className='h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm font-normal text-primary-black placeholder:text-[#98A2B3]'
                        />
                      </label>
                      <button
                        type='button'
                        onClick={() => saveReview(application, check)}
                        disabled={isSaving}
                        className='inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        {isSaving ? <Loader2 className='h-4 w-4 animate-spin' /> : <CircleAlert className='h-4 w-4' />}
                        Save review
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default EligibilityReviewQueue;
