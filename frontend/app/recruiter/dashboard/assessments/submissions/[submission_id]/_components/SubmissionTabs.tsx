"use client";

import { useState } from "react";
import { FileText, ShieldCheck } from "lucide-react";

import { cn } from "@/app/common/utils";
import AssessmentQuestionsTab from "@/app/recruiter/dashboard/components/JobApplicationGrid/AssessmentQuestionsTab";
import ProctoringReportTab from "@/app/recruiter/dashboard/components/JobApplicationGrid/ProctoringReportTab";

const TABS = [
  { id: "answers", label: "Answers", Icon: FileText },
  { id: "proctoring", label: "Proctoring Report", Icon: ShieldCheck },
] as const;

/** Switches between the candidate's graded answers and their proctoring
 * report -- both already exist as standalone tab components (built for the
 * job-application applicant modal), reused here as-is so the recruiter has
 * one place to see everything about a standalone-assessment submission. */
const SubmissionTabs = ({ submissionId }: { submissionId: string }) => {
  const [active, setActive] = useState<(typeof TABS)[number]["id"]>("answers");

  return (
    <div>
      <div className='flex gap-1 mb-4'>
        {TABS.map(tab => (
          <button
            key={tab.id}
            type='button'
            onClick={() => setActive(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors",
              active === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-secondary-black hover:text-primaryBlack"
            )}
          >
            <tab.Icon className='w-4 h-4' />
            {tab.label}
          </button>
        ))}
      </div>

      {active === "answers" ? (
        <AssessmentQuestionsTab submissionId={submissionId} />
      ) : (
        <ProctoringReportTab submissionId={submissionId} />
      )}
    </div>
  );
};

export default SubmissionTabs;
