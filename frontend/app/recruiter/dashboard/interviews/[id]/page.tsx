import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Video, Circle, Sparkles } from "lucide-react";

import { cn } from "@/app/common/utils";
import { getRecruiterInterview } from "@/app/common/services/interviews";
import {
  formatInterviewStart,
  interviewTypeLabel,
} from "../interviews.constants";

export const metadata = {
  title: "Interview",
};

type Props = {
  params: Promise<{ id: string }>;
};

/** Placeholder for the live interview workspace so the "Join Interview" links
 * on /recruiter/dashboard/interviews resolve. It only surfaces the same basic
 * fields the list already knows about -- the real workspace (video room, AI
 * copilot, note-taking, decision submission) is a later phase. */
const InterviewWorkspacePage = async ({ params }: Props) => {
  const { id } = await params;
  const interview = await getRecruiterInterview(id).catch(e => {
    console.log(
      "Get recruiter interview error (interview workspace page): ",
      e?.message
    );
    return null;
  });
  if (!interview) return notFound();

  const badgeBase =
    "text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap";

  const details = [
    {
      label: "Scheduled for",
      value: formatInterviewStart(interview.meeting_date, interview.start_time),
      Icon: Clock,
    },
    {
      label: "Format",
      value: `${
        interviewTypeLabel[interview.interview_type] ?? interview.interview_type
      } · ${interview.duration_minutes} minutes`,
      Icon: Video,
    },
    {
      label: "Recording",
      value: interview.recording_enabled ? "Enabled" : "Disabled",
      Icon: Circle,
    },
    {
      label: "Interview brief",
      value: interview.prep_ready ? "Brief ready" : "Not prepared",
      Icon: Sparkles,
    },
  ];

  return (
    <div className='p-8 max-md:px-1 flex flex-col gap-6 sm:gap-8 dashboard-content-constraint'>
      <div>
        <Link
          href='/recruiter/dashboard/interviews'
          className='inline-flex items-center gap-1.5 text-sm text-secondary-black hover:text-primary mb-4'
        >
          <ArrowLeft className='w-4 h-4' />
          Back to interviews
        </Link>

        <div className='border-b border-gray-200 pb-1'>
          <div className='flex items-center gap-3 flex-wrap mb-1'>
            <h1 className='text-2xl font-space-grotesk font-semibold'>
              {interview.candidate_name || "Unknown candidate"}
            </h1>
            <span
              className={cn(
                badgeBase,
                interview.tab === "live"
                  ? "bg-success/10 text-success"
                  : "bg-[#F5F6F7] text-secondary-black"
              )}
            >
              {interview.status.replaceAll("_", " ").toLowerCase()}
            </span>
          </div>
          <p className='text-gray-900 text-base'>
            {interview.job_title || "Untitled role"}
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        {details.map(({ label, value, Icon }) => (
          <div
            key={label}
            className='bg-white border border-[#EAECF0] rounded-2lg p-5 flex items-start gap-3'
          >
            <div className='w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0'>
              <Icon className='w-4 h-4' />
            </div>
            <div className='min-w-0'>
              <p className='text-xs text-secondary-black'>{label}</p>
              <p className='text-sm font-medium text-primaryBlack'>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className='bg-white border border-dashed border-[#D0D5DD] rounded-2lg p-8 flex flex-col items-center text-center gap-2'>
        <div className='w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2'>
          <Video className='w-5 h-5 text-primary' />
        </div>
        <p className='font-medium text-primaryBlack'>
          The live interview workspace is on its way
        </p>
        <p className='text-sm text-secondary-black max-w-md'>
          The video room, AI copilot and scorecard will live here. In the
          meantime you can review the interview brief for this candidate.
        </p>
        <Link
          href={`/recruiter/dashboard/interviews/${id}/prepare`}
          className='btn btn-sm btn-primary text-white rounded-lg mt-2 border-none'
        >
          Open interview prep
        </Link>
      </div>
    </div>
  );
};

export default InterviewWorkspacePage;
