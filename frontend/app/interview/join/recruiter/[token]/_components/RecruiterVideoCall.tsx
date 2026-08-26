"use client";

import { useEffect, useRef } from "react";
import { useCallFrame } from "@daily-co/daily-react";

/**
 * Recruiter side of the live interview. Deliberately a separate component from
 * CandidateVideoCall rather than a prop-flag on it, because the two sides have
 * genuinely opposite behaviour:
 *
 *  - the recruiter joins as room owner and *must* have a leave control, since
 *    ending the interview is their job alone;
 *  - the candidate's frame auto-leaves when the owner drops, which would be
 *    meaningless here (the recruiter is the owner);
 *  - leaving here finalises the interview (COMPLETED + scoring pipeline),
 *    which must never happen when a candidate leaves.
 *
 * Keeping them apart means the candidate flow cannot regress from a change
 * made for the recruiter.
 */
const RecruiterVideoCall = ({
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
      // The recruiter is the only participant who can end the interview.
      showLeaveButton: true,
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

    const handleError = (event?: { errorMsg?: string }) =>
      settle(() =>
        onFailure(
          event?.errorMsg ||
            "We couldn't connect you to the interview. Please try again."
        )
      );

    call.on("left-meeting", handleLeft);
    call.on("error", handleError);

    call.join({ url, token }).catch((error: { errorMsg?: string }) => {
      settle(() =>
        onFailure(
          error?.errorMsg ||
            "We couldn't connect you to the interview. Please try again."
        )
      );
    });

    return () => {
      call.off("left-meeting", handleLeft);
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

export default RecruiterVideoCall;
