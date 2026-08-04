"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Mic, MicOff, Video, VideoOff } from "lucide-react";

import DaisyButton from "@/app/common/components/DaisyButton";
import useMicCheck from "@/app/common/hooks/useMicCheck";
import { cn } from "@/app/common/utils";

const BAR_COUNT = 5;

const StatusDot = ({ tone }: { tone: "success" | "error" | "pending" }) => (
  <span
    className={cn(
      "h-2.5 w-2.5 rounded-full shrink-0",
      tone === "success" && "bg-primary",
      tone === "error" && "bg-error",
      tone === "pending" && "bg-gray-300 animate-pulse"
    )}
  />
);

const AIInterviewSetupCheck = ({
  durationMinutes,
  onStart,
  starting,
}: {
  durationMinutes: number;
  onStart: (cameraEnabled: boolean) => void;
  starting: boolean;
}) => {
  const { status, micLevel, micSignalDetected, retry } = useMicCheck();
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const checking = status === "checking";
  const blocked = status === "denied";
  const micReady = status === "ready";
  const activeBars = Math.round(micLevel * BAR_COUNT);

  useEffect(() => {
    if (!cameraEnabled) {
      cameraStream?.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      return;
    }
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: true })
      .then(stream => {
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        setCameraStream(stream);
      })
      .catch(() => setCameraEnabled(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraEnabled]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      void videoRef.current.play().catch(() => {});
    }
    return () => {
      // Stopped by the toggle effect above, not here -- this only runs on
      // stream/element swap, not on every render.
    };
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach(track => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const micLabel = checking
    ? "Checking your microphone..."
    : micReady
      ? micSignalDetected
        ? "Microphone is working"
        : "Microphone connected -- say something to test it"
      : blocked
        ? "Microphone access was blocked. Allow microphone access in your browser, then try again."
        : "No microphone detected. Connect a microphone and try again.";

  return (
    <section className='w-full lg:w-3/5 bg-white px-6 md:px-10 lg:px-12 py-8 lg:py-12'>
      <div className='w-full max-w-xl mx-auto lg:mx-0'>
        <h2 className='text-2xl lg:text-[28px] font-bold text-primary-black font-space-grotesk'>
          Check your setup
        </h2>
        <p className='text-secondary-black mt-1 mb-8'>Take a moment to check your microphone</p>

        {/* Microphone */}
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-3'>
            <span className='flex items-center gap-2 text-sm font-semibold text-primary-black'>
              {micReady ? (
                <Mic className='h-4 w-4 text-secondary-black' />
              ) : (
                <MicOff className='h-4 w-4 text-error' />
              )}
              Microphone
            </span>
            {micSignalDetected && (
              <span className='flex items-center gap-1.5 text-xs font-medium text-primary'>
                <span className='h-4 w-4 rounded-full bg-primary/15 flex items-center justify-center'>
                  <Check className='h-3 w-3 text-primary' strokeWidth={3} />
                </span>
                Audio detected
              </span>
            )}
          </div>

          <div
            role='meter'
            aria-label='Microphone input level'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(micLevel * 100)}
            className='flex items-end gap-2 h-12 rounded-xl bg-[#F7F7FB] px-4 py-3'
          >
            {Array.from({ length: BAR_COUNT }).map((_, index) => (
              <span
                key={index}
                style={{ height: `${30 + index * 15}%` }}
                className={cn(
                  "w-2.5 rounded-full transition-colors duration-75",
                  micReady && index < activeBars ? "bg-primary" : "bg-gray-200"
                )}
              />
            ))}
          </div>

          <div className='flex items-start gap-2.5 mt-3' aria-live='polite'>
            <span className='pt-1'>
              <StatusDot tone={checking ? "pending" : micReady ? "success" : "error"} />
            </span>
            <p
              className={cn(
                "text-sm leading-6",
                micReady ? "text-primary-black font-medium" : checking ? "text-secondary-black" : "text-error"
              )}
            >
              {micLabel}
            </p>
          </div>

          {(blocked || status === "unavailable") && (
            <div className='mt-3'>
              <DaisyButton color='primary' variant='outline' size='sm' onClick={retry}>
                Try again
              </DaisyButton>
            </div>
          )}
        </div>

        {/* Camera -- optional, off by default */}
        <div className='mb-8'>
          <label className='flex items-center justify-between gap-3 cursor-pointer mb-3'>
            <span className='flex items-center gap-2 text-sm font-semibold text-primary-black'>
              {cameraEnabled ? (
                <Video className='h-4 w-4 text-secondary-black' />
              ) : (
                <VideoOff className='h-4 w-4 text-secondary-black' />
              )}
              Camera (optional)
            </span>
            <input
              type='checkbox'
              checked={cameraEnabled}
              onChange={event => setCameraEnabled(event.target.checked)}
              className='toggle toggle-primary toggle-sm'
            />
          </label>

          {cameraEnabled && (
            <div className='relative w-full h-[160px] rounded-xl overflow-hidden bg-[#0B1220]'>
              <video ref={videoRef} autoPlay muted playsInline className='h-full w-full object-cover' />
            </div>
          )}
          <p className='text-xs text-secondary-black mt-2'>Optional -- makes the interview feel more natural</p>
        </div>

        <DaisyButton
          color='primary'
          onClick={() => onStart(cameraEnabled)}
          disabled={!micReady || starting}
          loading={starting}
          className='w-full h-[52px] min-h-[52px] text-base font-semibold text-white'
        >
          {starting ? "Connecting..." : "Start interview with Alex"}
        </DaisyButton>

        <p className='text-xs text-secondary-black text-center mt-3'>
          About {durationMinutes} minutes &middot; Responses are recorded
        </p>
      </div>
    </section>
  );
};

export default AIInterviewSetupCheck;
