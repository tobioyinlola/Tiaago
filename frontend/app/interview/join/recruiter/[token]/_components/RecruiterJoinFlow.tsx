"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import {
  endInterviewAsRecruiter,
  joinInterviewAsRecruiter,
  type RecruiterInterviewLookup,
  type RecruiterJoinResponse,
} from "@/app/common/services/interview";
import DevicePrecheck from "../../../[token]/_components/DevicePrecheck";
import InterviewInfoPanel from "../../../[token]/_components/InterviewInfoPanel";
import InterviewNotice from "../../../[token]/_components/InterviewNotice";

const CallLoader = () => (
  <div className='fixed inset-0 bg-deep-blue flex items-center justify-center'>
    <span className='loading loading-dots loading-lg text-white' />
  </div>
);

// daily-js touches browser globals on import -- keep it out of SSR and out of
// the initial bundle for the precheck screen.
const RecruiterVideoCall = dynamic(() => import("./RecruiterVideoCall"), {
  ssr: false,
  loading: () => <CallLoader />,
});

type Phase = "precheck" | "in-call" | "ended";
type FoundInterview = Extract<RecruiterInterviewLookup, { found: true }>;

const RecruiterJoinFlow = ({
  token,
  interview,
}: {
  token: string;
  interview: FoundInterview;
}) => {
  const [phase, setPhase] = useState<Phase>("precheck");
  const [session, setSession] = useState<RecruiterJoinResponse | null>(null);
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    setJoining(true);
    // Recording follows whatever was set when the interview was scheduled --
    // the recruiter already made that choice there, and the candidate has
    // already consented (or not) on that basis, so it must not be flipped here.
    const result = await joinInterviewAsRecruiter(
      token,
      interview.recording_enabled
    );
    if (!result.success) {
      // Backend owns this copy (expired link, room not ready, insufficient
      // wallet balance, ...) -- show it as-is.
      toast.error(result.error);
      setJoining(false);
      return;
    }
    setSession(result.data);
    setPhase("in-call");
  };

  // Leaving the room is what ends the interview for everyone: it marks the
  // interview COMPLETED and starts the summary/scoring pipeline. The UI moves
  // on regardless of the result -- the recruiter has already left the call by
  // this point, so blocking them on a failed request helps nobody; the error
  // is surfaced so they know to end it from the dashboard instead.
  const handleEnded = async () => {
    setPhase("ended");
    const result = await endInterviewAsRecruiter(token);
    if (!result.success) {
      toast.error(
        `${result.error} You may need to end this interview from your dashboard.`
      );
    }
  };

  const handleFailure = (message: string) => {
    toast.error(message);
    setSession(null);
    setJoining(false);
    setPhase("precheck");
  };

  if (phase === "ended") {
    return (
      <InterviewNotice
        tone='success'
        Icon={CheckCircle2}
        title='Interview ended.'
        description="We're preparing the transcript, summary and scorecard. They'll be on the interview's review page in your dashboard shortly."
      />
    );
  }

  if (phase === "in-call" && session) {
    return (
      <RecruiterVideoCall
        url={session.roomUrl}
        token={session.participantToken}
        onEnded={handleEnded}
        onFailure={handleFailure}
      />
    );
  }

  return (
    <div className='min-h-[100svh] w-full flex flex-col lg:flex-row'>
      <InterviewInfoPanel interview={interview} />
      {/* recordingEnabled={false} suppresses the candidate-facing recording
          consent block -- consent is the candidate's to give, not the
          recruiter's, and the recording decision was already made when the
          interview was scheduled. */}
      <DevicePrecheck
        recordingEnabled={false}
        consentGiven
        onConsentChange={() => {}}
        onJoin={handleJoin}
        joining={joining}
      />
    </div>
  );
};

export default RecruiterJoinFlow;
