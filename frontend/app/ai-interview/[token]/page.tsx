import type { Metadata } from "next";
import { CheckCircle2, LinkIcon, TriangleAlert } from "lucide-react";

import { getAIInterviewByToken } from "@/app/common/services/ai-interviews";
import AIInterviewNotice from "./_components/AIInterviewNotice";
import AIInterviewPreJoinFlow from "./_components/AIInterviewPreJoinFlow";

export const metadata: Metadata = {
  title: "AI Interview",
  // The token in the URL is the candidate's credential -- keep it out of indexes.
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

/**
 * Public, unauthenticated candidate entry point for the AI interview.
 * Reached straight from the invitation email; the visitor has no account,
 * so this route deliberately sits outside every authenticated area and
 * outside the (home) group (the only one that renders the marketing navbar).
 */
const AIInterviewJoinPage = async ({ params }: Props) => {
  const { token } = await params;
  const result = await getAIInterviewByToken(token);

  if (!result.success) {
    return (
      <AIInterviewNotice
        tone='error'
        Icon={TriangleAlert}
        title="We couldn't load your interview."
        description='Something went wrong on our end. Please refresh this page in a moment, or contact the recruiter who invited you if the problem continues.'
      />
    );
  }

  const interview = result.data;
  if (!interview.found) {
    return (
      <AIInterviewNotice
        tone='error'
        Icon={LinkIcon}
        title='This interview link is invalid or has expired.'
        description='Please check the link in your invitation email, or contact the recruiter who invited you.'
      />
    );
  }

  if (interview.status === "COMPLETED") {
    return (
      <AIInterviewNotice
        tone='success'
        Icon={CheckCircle2}
        title='This interview has already taken place.'
        description='If you think this is a mistake, please contact the recruiter who invited you.'
      />
    );
  }

  if (interview.expired || ["NO_SHOW", "ABANDONED", "FAILED"].includes(interview.status)) {
    return (
      <AIInterviewNotice
        tone='error'
        Icon={LinkIcon}
        title='The window to complete this interview has closed.'
        description='Please contact the recruiter who invited you if you still want to be considered.'
      />
    );
  }

  return <AIInterviewPreJoinFlow token={token} interview={interview} />;
};

export default AIInterviewJoinPage;
