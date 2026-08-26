import type { Metadata } from "next";
import { CalendarX2, CheckCircle2, LinkIcon, TriangleAlert } from "lucide-react";

import { getInterviewByRecruiterToken } from "@/app/common/services/interview";
import InterviewNotice from "../../[token]/_components/InterviewNotice";
import RecruiterJoinFlow from "./_components/RecruiterJoinFlow";

export const metadata: Metadata = {
  title: "Join Interview",
  // The token in the URL is the recruiter's credential -- keep it out of indexes.
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

/**
 * Public, unauthenticated recruiter entry point for a live video interview --
 * the mirror of the candidate's /interview/join/[token] page.
 *
 * Recruiters previously had to log in and find the interview in the dashboard
 * before they could join, which is a poor fit for a link tapped on a phone a
 * minute before a call starts. The recruiter_join_token in the emailed link is
 * the credential here, exactly as the candidate's token is on their side.
 *
 * Joining still charges the interview package server-side (see
 * scheduler.copilot_views.RecruiterTokenJoinView), so this is not a way around
 * wallet billing.
 */
const RecruiterJoinInterviewPage = async ({ params }: Props) => {
  const { token } = await params;
  const result = await getInterviewByRecruiterToken(token);

  // A lookup failure is the service being unreachable, not a bad token -- don't
  // tell the recruiter their link is broken when it isn't.
  if (!result.success) {
    return (
      <InterviewNotice
        tone='error'
        Icon={TriangleAlert}
        title="We couldn't load this interview."
        description='Something went wrong on our end. Please refresh this page in a moment, or open the interview from your dashboard instead.'
      />
    );
  }

  const interview = result.data;
  if (!interview.found) {
    return (
      <InterviewNotice
        tone='error'
        Icon={LinkIcon}
        title='This interview link is invalid or has expired.'
        description='Please check the link in your notification email, or open the interview from your dashboard instead.'
      />
    );
  }

  if (interview.status === "COMPLETED") {
    return (
      <InterviewNotice
        tone='neutral'
        Icon={CheckCircle2}
        title='This interview has already taken place.'
        description='You can review the summary and scorecard from your dashboard.'
      />
    );
  }

  if (interview.status === "CANCELLED") {
    return (
      <InterviewNotice
        tone='error'
        Icon={CalendarX2}
        title='This interview has been cancelled.'
        description='Nothing further is needed here.'
      />
    );
  }

  return <RecruiterJoinFlow token={token} interview={interview} />;
};

export default RecruiterJoinInterviewPage;
