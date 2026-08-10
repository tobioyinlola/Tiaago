import { notFound, redirect } from "next/navigation";

import { getRecruiterInterview } from "@/app/common/services/interviews";

type Props = {
  params: Promise<{ id: string }>;
};

/** Bare `/interviews/[id]` has no view of its own -- it exists so any link
 * built without a subpath (older emails/notifications, stale bookmarks)
 * still lands somewhere useful instead of a dead placeholder. Routes to the
 * real destination for the interview's current state. */
const InterviewRedirectPage = async ({ params }: Props) => {
  const { id } = await params;
  const interview = await getRecruiterInterview(id).catch(() => null);
  if (!interview) return notFound();

  if (interview.tab === "live") redirect(`/recruiter/dashboard/interviews/${id}/session`);
  if (interview.tab === "needs_review" || interview.tab === "completed") {
    redirect(`/recruiter/dashboard/interviews/${id}/review`);
  }
  redirect(`/recruiter/dashboard/interviews/${id}/prepare`);
};

export default InterviewRedirectPage;
