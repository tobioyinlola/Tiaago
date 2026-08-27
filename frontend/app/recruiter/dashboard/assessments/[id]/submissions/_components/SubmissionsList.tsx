"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Check, ChevronRight } from "lucide-react";

import { cn } from "@/app/common/utils";
import { ID, SkillAssessmentResult } from "@/app/common/types";
import Button from "@/app/common/components/DaisyButton";
import { useAlert } from "@/app/common/store/useAlert";
import { approveSubmission } from "@/app/common/services/assessment";

const statusBadge: Record<string, string> = {
  Marked: "bg-badge-green-bg text-badge-green-text",
  "Awaiting Manual Review": "bg-badge-purple-bg text-badge-purple-text",
  Pending: "bg-[#F5F6F7] text-secondary-black",
  "Failed to Mark": "bg-destructive/10 text-destructive",
};

const initials = (name?: string | null) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("");

const SubmissionsList = ({
  assessmentId,
  submissions,
  /** Mirrors the assessment's display_review_and_approve_responses toggle.
   * With it off, results release to candidates automatically and there is
   * nothing to approve -- so the control isn't rendered at all. */
  requiresApproval,
}: {
  assessmentId: ID;
  submissions: SkillAssessmentResult[];
  requiresApproval: boolean;
}) => {
  const setAlert = useAlert(s => s.setAlert);
  const [rows, setRows] = useState<SkillAssessmentResult[]>(submissions);
  const [approvingId, setApprovingId] = useState<ID | null>(null);

  const handleApprove = async (submissionId: ID) => {
    setApprovingId(submissionId);
    const res = await approveSubmission(submissionId);
    setApprovingId(null);
    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    setRows(current =>
      current.map(row => (row.id === submissionId ? { ...row, ...res.data } : row))
    );
  };

  return (
    <div className='bg-white rounded-2lg border border-[#EAECF0] divide-y divide-[#EAECF0] overflow-hidden'>
      {rows.map(submission => (
        <div
          key={submission.id}
          className='flex items-center justify-between gap-4 px-6 py-4 hover:bg-[#F8FAFC] transition-colors'
        >
          <Link
            href={{
              pathname: `/recruiter/dashboard/assessments/submissions/${submission.id}`,
              query: {
                name: submission.candidate_name || "",
                email: submission.candidate_email || "",
                score: submission.total_score ?? "",
                status: submission.mark_status || "",
                assessmentId: String(assessmentId),
              },
            }}
            className='flex flex-1 items-center justify-between gap-4 min-w-0'
          >
            <div className='flex items-center gap-3 min-w-0'>
              <div className='w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0'>
                {initials(submission.candidate_name)}
              </div>
              <div className='min-w-0'>
                <p className='text-sm font-medium text-primaryBlack truncate'>
                  {submission.candidate_name || "Unknown candidate"}
                </p>
                <p className='text-xs text-secondary-black truncate'>{submission.candidate_email}</p>
                {/* A forced end still produces a real, graded score -- this is
                    what distinguishes it from a candidate who simply did badly. */}
                {submission.auto_submitted && (
                  <span
                    title={submission.auto_submit_reason || undefined}
                    className='mt-1 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive'
                  >
                    <AlertTriangle className='h-3 w-3 shrink-0' aria-hidden='true' />
                    Auto submitted
                  </span>
                )}
              </div>
            </div>
            <div className='flex items-center gap-4 shrink-0'>
              <span className='text-sm font-medium text-primaryBlack'>
                {submission.total_score !== null ? `${submission.total_score}%` : "--"}
              </span>
              <span
                className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap",
                  statusBadge[submission.mark_status || "Pending"]
                )}
              >
                {submission.mark_status}
              </span>
            </div>
          </Link>

          {requiresApproval && (
            <div className='shrink-0'>
              {submission.approved_at ? (
                <span className='flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-badge-green-bg text-badge-green-text whitespace-nowrap'>
                  <Check className='w-3.5 h-3.5' />
                  Approved
                </span>
              ) : (
                <Button
                  type='button'
                  color='primary'
                  variant='outline'
                  size='sm'
                  className='gap-1'
                  loading={approvingId === submission.id}
                  onClick={() => handleApprove(submission.id)}
                >
                  Approve
                </Button>
              )}
            </div>
          )}

          <ChevronRight className='w-4 h-4 text-secondary-black shrink-0' />
        </div>
      ))}
    </div>
  );
};

export default SubmissionsList;
