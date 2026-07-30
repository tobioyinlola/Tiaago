import { notFound } from "next/navigation";

import { getRecruiterInterview } from "@/app/common/services/interviews";
import { getAuthCookiesAsync } from "@/app/common/actions";
import WorkspaceView from "./_components/WorkspaceView";

export const metadata = {
  title: "Interview Session",
};

type Props = {
  params: Promise<{ id: string }>;
};

/** Live interview workspace -- video call, question checklist, notes, AI
 * copilot panel, and the competency scorecard. Billing is charged and the
 * Daily.co room is joined client-side once this mounts (see WorkspaceView),
 * not here -- a server component re-running on every navigation/refresh
 * would be the wrong place to trigger a one-time charge. */
const InterviewSessionPage = async ({ params }: Props) => {
  const { id } = await params;
  const interview = await getRecruiterInterview(id).catch(e => {
    console.log("Get recruiter interview error (session page): ", e?.message);
    return null;
  });
  if (!interview) return notFound();
  if (interview.status === "CANCELLED" || interview.status === "COMPLETED") {
    return notFound();
  }
  const { access } = await getAuthCookiesAsync();

  return (
    <WorkspaceView
      interviewId={id}
      candidateName={interview.candidate_name}
      jobTitle={interview.job_title}
      durationMinutes={interview.duration_minutes}
      recordingEnabled={interview.recording_enabled}
      accessToken={access?.value ?? ""}
    />
  );
};

export default InterviewSessionPage;
