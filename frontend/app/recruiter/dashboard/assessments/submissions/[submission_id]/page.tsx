import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { ISearchParams } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import SubmissionTabs from "./_components/SubmissionTabs";

type Props = {
  params: Promise<{ submission_id: string }>;
  searchParams: Promise<ISearchParams>;
};

export const metadata = {
  title: "Submission",
};

const asString = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : Array.isArray(value) ? value[0] : "";

const statusBadge: Record<string, string> = {
  Marked: "bg-badge-green-bg text-badge-green-text",
  "Awaiting Manual Review": "bg-badge-purple-bg text-badge-purple-text",
  Pending: "bg-[#F5F6F7] text-secondary-black",
  "Failed to Mark": "bg-destructive/10 text-destructive",
};

const initials = (name?: string) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("");

const SubmissionDetailPage = async ({ params, searchParams }: Props) => {
  const { submission_id } = await params;
  const resolvedSearchParams = await searchParams;
  const name = asString(resolvedSearchParams.name);
  const email = asString(resolvedSearchParams.email);
  const score = asString(resolvedSearchParams.score);
  const status = asString(resolvedSearchParams.status);
  const assessmentId = asString(resolvedSearchParams.assessmentId);

  return (
    <div className='text-black max-w-5xl'>
      {assessmentId && (
        <Link
          href={`/recruiter/dashboard/assessments/${assessmentId}/submissions`}
          className='flex items-center gap-1 text-sm text-secondary-black hover:text-primary mb-3 w-fit'
        >
          <ChevronLeft className='w-4 h-4' />
          Back to submissions
        </Link>
      )}

      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-3'>
          <div className='w-11 h-11 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center shrink-0'>
            {initials(name)}
          </div>
          <div>
            <h1 className='text-2xl font-semibold font-space-grotesk text-primaryBlack'>
              {name || "Candidate submission"}
            </h1>
            <p className='text-secondary-black text-sm'>{email}</p>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          {score && (
            <span className='text-sm font-medium text-primaryBlack bg-[#F5F6F7] px-3 py-1.5 rounded-full'>
              Score: {score}%
            </span>
          )}
          {status && (
            <span
              className={cn(
                "text-xs font-medium px-2.5 py-1.5 rounded-full",
                statusBadge[status] ?? "bg-[#F5F6F7] text-secondary-black"
              )}
            >
              {status}
            </span>
          )}
        </div>
      </div>

      <SubmissionTabs submissionId={submission_id} />
    </div>
  );
};

export default SubmissionDetailPage;
