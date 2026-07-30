import type { Metadata } from "next";
import { CalendarX2, CheckCircle2, LinkIcon, TriangleAlert } from "lucide-react";

import { getInterviewByToken } from "@/app/common/services/interview";
import InterviewNotice from "./_components/InterviewNotice";
import JoinInterviewFlow from "./_components/JoinInterviewFlow";

export const metadata: Metadata = {
  title: "Join Interview",
  // The token in the URL is the candidate's credential -- keep it out of indexes.
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

/**
 * Public, unauthenticated candidate entry point for a live video interview.
 * Reached straight from an email/booking-confirmation link; the visitor has no
 * account, so this route deliberately sits outside every authenticated area and
 * outside the `(home)` group (the only one that renders the marketing navbar).
 */
const JoinInterviewPage = async ({ params }: Props) => {
  const { token } = await params;
  const result = await getInterviewByToken(token);

  const invalidLinkNotice = (
    <InterviewNotice
      tone='error'
      Icon={LinkIcon}
      title='This interview link is invalid or has expired.'
      description='Please check the link in your invitation email, or contact the recruiter who invited you.'
    />
  );

  // A lookup failure is the service being unreachable, not a bad token -- don't
  // tell the candidate their link is broken when it isn't.
  if (!result.success) {
    return (
      <InterviewNotice
        tone='error'
        Icon={TriangleAlert}
        title="We couldn't load your interview."
        description='Something went wrong on our end. Please refresh this page in a moment, or contact the recruiter who invited you if the problem continues.'
      />
    );
  }

  const interview = result.data;
  if (!interview.found) return invalidLinkNotice;

  if (interview.status === "COMPLETED") {
    return (
      <InterviewNotice
        tone='neutral'
        Icon={CheckCircle2}
        title='This interview has already taken place.'
        description='If you think this is a mistake, please contact the recruiter who invited you.'
      />
    );
  }

  if (interview.status === "CANCELLED") {
    return (
      <InterviewNotice
        tone='error'
        Icon={CalendarX2}
        title='This interview has been cancelled.'
        description='Please contact the recruiter.'
      />
    );
  }

  return <JoinInterviewFlow token={token} interview={interview} />;
};

export default JoinInterviewPage;
