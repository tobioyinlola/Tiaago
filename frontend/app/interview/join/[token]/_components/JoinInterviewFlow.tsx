"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import {
  joinInterviewAsCandidate,
  type CandidateJoinResponse,
  type InterviewDetails,
} from "@/app/common/services/interview";
import DevicePrecheck from "./DevicePrecheck";
import InterviewInfoPanel from "./InterviewInfoPanel";
import InterviewNotice from "./InterviewNotice";

const CallLoader = () => (
  <div className='fixed inset-0 bg-deep-blue flex items-center justify-center'>
    <span className='loading loading-dots loading-lg text-white' />
  </div>
);

// daily-js touches browser globals on import -- keep it out of SSR and out of
// the initial bundle for the precheck screen.
const CandidateVideoCall = dynamic(() => import("./CandidateVideoCall"), {
  ssr: false,
  loading: () => <CallLoader />,
});

type Phase = "precheck" | "in-call" | "ended";

const JoinInterviewFlow = ({
  token,
  interview,
}: {
  token: string;
  interview: InterviewDetails;
}) => {
  const [phase, setPhase] = useState<Phase>("precheck");
  const [session, setSession] = useState<CandidateJoinResponse | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    setJoining(true);
    const result = await joinInterviewAsCandidate(token, consentGiven);
    if (!result.success) {
      // Backend owns this copy (expired link, room not ready, already
      // completed, ...) -- show it as-is.
      toast.error(result.error);
      setJoining(false);
      return;
    }
    setSession(result.data);
    setPhase("in-call");
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
        title='Interview has ended. Thank you for your time.'
        description='You will receive feedback by email shortly.'
      />
    );
  }

  if (phase === "in-call" && session) {
    return (
      <CandidateVideoCall
        url={session.roomUrl}
        token={session.participantToken}
        onEnded={() => setPhase("ended")}
        onFailure={handleFailure}
      />
    );
  }

  return (
    <div className='min-h-[100svh] w-full flex flex-col lg:flex-row'>
      <InterviewInfoPanel interview={interview} />
      <DevicePrecheck
        recordingEnabled={interview.recording_enabled}
        consentGiven={consentGiven}
        onConsentChange={setConsentGiven}
        onJoin={handleJoin}
        joining={joining}
      />
    </div>
  );
};

export default JoinInterviewFlow;
