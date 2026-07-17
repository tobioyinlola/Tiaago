"use client";

import { useEffect, useRef } from "react";

import { uploadAssessmentInviteSnapshot } from "../services/assessment-invite-client";

/** Periodically grabs a frame from an already-granted camera MediaStream and
 * uploads it for the recruiter to spot-check. No-ops silently if there's no
 * stream (camera permission was denied or never requested) -- proctoring is
 * best-effort, never blocks the candidate from taking the assessment. */
export const useSnapshotCapture = (
  token: string,
  stream: MediaStream | null,
  intervalMs = 3 * 60 * 1000
) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!stream) return;

    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});
    videoRef.current = video;

    const canvas = document.createElement("canvas");

    const captureAndUpload = () => {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return;
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        blob => {
          if (blob) uploadAssessmentInviteSnapshot(token, blob);
        },
        "image/jpeg",
        0.7
      );
    };

    const interval = setInterval(captureAndUpload, intervalMs);
    // one baseline capture shortly after the assessment starts
    const initialTimeout = setTimeout(captureAndUpload, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
      video.pause();
      video.srcObject = null;
    };
  }, [token, stream, intervalMs]);
};
