"use client";

import { Check, Mic, MicOff, VideoOff } from "lucide-react";

import DaisyButton from "@/app/common/components/DaisyButton";
import useDeviceCheck from "@/app/common/hooks/useDeviceCheck";
import { cn } from "@/app/common/utils";

/** Relative heights (%) so the meter reads as a waveform rather than a flat row. */
const BAR_HEIGHTS = [38, 55, 72, 88, 100, 84, 68, 100, 86, 70, 54, 82, 64, 42];

const StatusDot = ({ tone }: { tone: "success" | "error" | "pending" }) => (
  <span
    className={cn(
      "h-2.5 w-2.5 rounded-full shrink-0",
      tone === "success" && "bg-success",
      tone === "error" && "bg-error",
      tone === "pending" && "bg-gray-300 animate-pulse"
    )}
  />
);

const DevicePrecheck = ({
  recordingEnabled,
  consentGiven,
  onConsentChange,
  onJoin,
  joining,
}: {
  recordingEnabled: boolean;
  consentGiven: boolean;
  onConsentChange: (value: boolean) => void;
  onJoin: () => void;
  joining: boolean;
}) => {
  const { videoRef, status, cameraOn, micOn, micLevel, micSignalDetected, retry } =
    useDeviceCheck();

  const checking = status === "checking";
  const blocked = status === "denied";
  const activeBars = Math.round(micLevel * BAR_HEIGHTS.length);

  const consentSatisfied = !recordingEnabled || consentGiven;
  const canJoin = cameraOn && micOn && consentSatisfied && !joining;

  const cameraLabel = checking
    ? "Checking your camera..."
    : cameraOn
      ? "Camera is working"
      : blocked
        ? "Camera access was blocked. Allow camera access in your browser, then try again."
        : "No camera detected. Connect a camera and try again.";

  const micLabel = checking
    ? "Checking your microphone..."
    : micOn
      ? micSignalDetected
        ? "Microphone is working"
        : "Microphone connected -- say something to test it"
      : blocked
        ? "Microphone access was blocked. Allow microphone access in your browser, then try again."
        : "No microphone detected. Connect a microphone and try again.";

  const blockedReason = !cameraOn
    ? "We need access to your camera before you can join."
    : !micOn
      ? "We need access to your microphone before you can join."
      : !consentSatisfied
        ? "Please confirm the recording notice above to continue."
        : "";

  return (
    <section className='w-full lg:w-3/5 bg-white px-6 md:px-10 lg:px-12 py-8 lg:py-12'>
      <div className='w-full max-w-xl mx-auto lg:mx-0'>
        <h2 className='text-2xl lg:text-[28px] font-bold text-primary-black font-space-grotesk'>
          Before you join
        </h2>
        <p className='text-secondary-black mt-1 mb-8'>Take a moment to check your setup</p>

        {/* Camera preview */}
        <div className='relative w-full h-[280px] rounded-2xl overflow-hidden bg-[#0B1220] mb-4'>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={cn(
              "h-full w-full object-cover transition-opacity duration-300",
              cameraOn ? "opacity-100" : "opacity-0"
            )}
          />
          {!cameraOn && (
            <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center'>
              {checking ? (
                <>
                  <span className='loading loading-spinner loading-md text-white/70' />
                  <p className='text-sm text-white/70'>Requesting camera access...</p>
                </>
              ) : (
                <>
                  <span className='h-12 w-12 rounded-full bg-white/10 flex items-center justify-center'>
                    <VideoOff className='h-6 w-6 text-white/70' />
                  </span>
                  <p className='text-sm text-white/70 max-w-xs'>Camera not detected</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className='flex items-start gap-2.5 mb-8' aria-live='polite'>
          <span className='pt-1'>
            <StatusDot tone={checking ? "pending" : cameraOn ? "success" : "error"} />
          </span>
          <p
            className={cn(
              "text-sm leading-6",
              cameraOn ? "text-primary-black font-medium" : checking ? "text-secondary-black" : "text-error"
            )}
          >
            {cameraLabel}
          </p>
        </div>

        {/* Microphone */}
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-3'>
            <span className='flex items-center gap-2 text-sm font-semibold text-primary-black'>
              {micOn ? (
                <Mic className='h-4 w-4 text-secondary-black' />
              ) : (
                <MicOff className='h-4 w-4 text-error' />
              )}
              Microphone
            </span>
            {micSignalDetected && (
              <span className='flex items-center gap-1.5 text-xs font-medium text-success'>
                <span className='h-4 w-4 rounded-full bg-success/15 flex items-center justify-center'>
                  <Check className='h-3 w-3 text-success' strokeWidth={3} />
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
            className='flex items-end gap-1 h-10 rounded-xl bg-[#F7F7FB] px-3 py-2'
          >
            {BAR_HEIGHTS.map((height, index) => (
              <span
                key={index}
                style={{ height: `${height}%` }}
                className={cn(
                  "w-1.5 rounded-full transition-colors duration-75",
                  micOn && index < activeBars ? "bg-success" : "bg-gray-200"
                )}
              />
            ))}
          </div>

          <div className='flex items-start gap-2.5 mt-3' aria-live='polite'>
            <span className='pt-1'>
              <StatusDot tone={checking ? "pending" : micOn ? "success" : "error"} />
            </span>
            <p
              className={cn(
                "text-sm leading-6",
                micOn ? "text-secondary-black" : checking ? "text-secondary-black" : "text-error"
              )}
            >
              {micLabel}
            </p>
          </div>
        </div>

        {(blocked || status === "unavailable") && (
          <div className='mb-8'>
            <DaisyButton color='primary' variant='outline' size='sm' onClick={retry}>
              Try again
            </DaisyButton>
          </div>
        )}

        {/* Recording consent -- required before joining when enabled */}
        {recordingEnabled && (
          <div className='mb-8 rounded-2xl border border-amber-400 bg-amber-50 p-5'>
            <h3 className='text-sm font-bold text-amber-900'>This interview will be recorded</h3>
            <p className='text-sm text-amber-900/80 leading-6 mt-1'>
              The recording will be reviewed by the hiring team and retained for 90 days.
            </p>
            <label className='flex items-start gap-3 mt-4 cursor-pointer'>
              <input
                type='checkbox'
                checked={consentGiven}
                onChange={event => onConsentChange(event.target.checked)}
                className='checkbox checkbox-primary checkbox-sm mt-0.5 shrink-0'
              />
              <span className='text-sm text-amber-900 leading-6'>
                I understand and consent to this interview being recorded
              </span>
            </label>
          </div>
        )}

        <DaisyButton
          color='success'
          onClick={onJoin}
          disabled={!canJoin}
          loading={joining}
          className='w-full h-[52px] min-h-[52px] text-base font-semibold text-white'
        >
          {joining ? "Connecting..." : "Join Interview"}
        </DaisyButton>

        {!joining && blockedReason && (
          <p className='text-xs text-secondary-black text-center mt-3'>{blockedReason}</p>
        )}
      </div>
    </section>
  );
};

export default DevicePrecheck;
