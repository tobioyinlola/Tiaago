"use client";

import { useEffect, useRef } from "react";
import { useCallFrame } from "@daily-co/daily-react";

/**
 * Candidate side of the live interview: Daily's prebuilt call UI (large main
 * participant + self-view PiP) with the leave button removed -- only the
 * recruiter ends the interview.
 */
const CandidateVideoCall = ({
  url,
  token,
  onEnded,
  onFailure,
}: {
  url: string;
  token: string;
  onEnded: () => void;
  onFailure: (message: string) => void;
}) => {
  const settledRef = useRef(false);
  const call = useCallFrame({
    options: {
      // The candidate must not be able to end the interview.
      showLeaveButton: false,
      showFullscreenButton: true,
      iframeStyle: {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        border: "0",
      },
      theme: {
        colors: {
          accent: "#5465FF",
          mainAreaBg: "#fff",
          accentText: "#fff",
          mainAreaBgAccent: "#1c3477",
        },
      },
    },
    shouldCreateInstance: () => true,
  });

  useEffect(() => {
    if (!call) return;

    const settle = (run: () => void) => {
      if (settledRef.current) return;
      settledRef.current = true;
      run();
    };

    const handleLeft = () => settle(onEnded);

    // The candidate's own frame doesn't necessarily notice the room ending just
    // because the recruiter left, so leave proactively when the owner drops.
    const handleParticipantLeft = (event?: { participant?: { owner?: boolean } }) => {
      if (event?.participant?.owner !== true || settledRef.current) return;
      Promise.resolve(call.leave()).catch(() => settle(onEnded));
    };

    const handleError = (event?: { errorMsg?: string }) =>
      settle(() =>
        onFailure(event?.errorMsg || "We couldn't connect you to the interview. Please try again.")
      );

    call.on("left-meeting", handleLeft);
    call.on("participant-left", handleParticipantLeft);
    call.on("error", handleError);

    call.join({ url, token }).catch((error: { errorMsg?: string }) => {
      settle(() =>
        onFailure(error?.errorMsg || "We couldn't connect you to the interview. Please try again.")
      );
    });

    return () => {
      call.off("left-meeting", handleLeft);
      call.off("participant-left", handleParticipantLeft);
      call.off("error", handleError);
      if (!call.isDestroyed()) call.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call, url, token]);

  return (
    <div className='fixed inset-0 bg-white flex items-center justify-center'>
      <span className='loading loading-dots loading-lg text-primary' />
    </div>
  );
};

export default CandidateVideoCall;
