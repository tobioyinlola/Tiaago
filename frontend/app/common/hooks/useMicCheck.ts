"use client";

import { useCallback, useEffect, useState } from "react";

export type MicCheckStatus = "checking" | "ready" | "denied" | "unavailable";

/** Level at which we consider the mic to be picking up real sound (0..1). */
const SIGNAL_THRESHOLD = 0.045;
/** How often the meter pushes a new level into React state (ms). */
const METER_INTERVAL = 60;

const isDenied = (error: unknown) => {
  const name = (error as { name?: string })?.name;
  return name === "NotAllowedError" || name === "SecurityError";
};

/**
 * Audio-only sibling of useDeviceCheck -- the AI interview pre-join page
 * only ever requires a microphone (camera is optional, off by default, and
 * only requested if the candidate opts in), so this never touches
 * getUserMedia({video: true}) on mount the way useDeviceCheck does.
 */
const useMicCheck = () => {
  const [status, setStatus] = useState<MicCheckStatus>("checking");
  const [micLevel, setMicLevel] = useState(0);
  const [micSignalDetected, setMicSignalDetected] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setMicLevel(0);
    setMicSignalDetected(false);
    setStatus("checking");
    setAttempt(a => a + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let audioCtx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let gain: GainNode | null = null;
    let stream: MediaStream | null = null;
    let removeGestureListeners: (() => void) | undefined;

    const run = async () => {
      const mediaDevices = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
      if (!mediaDevices?.getUserMedia) {
        setStatus("unavailable");
        return;
      }

      try {
        stream = await mediaDevices.getUserMedia({ audio: true });
      } catch (error) {
        if (cancelled) return;
        setStatus(isDenied(error) ? "denied" : "unavailable");
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      setStatus("ready");
      stream.getTracks().forEach(track => {
        track.addEventListener("ended", () => {
          if (!cancelled) setStatus("unavailable");
        });
      });

      const AudioCtor =
        typeof window !== "undefined"
          ? window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
          : undefined;
      if (!AudioCtor) return;

      try {
        audioCtx = new AudioCtor();
        source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        gain = audioCtx.createGain();
        gain.gain.value = 0;
        source.connect(analyser);
        analyser.connect(gain);
        gain.connect(audioCtx.destination);

        void audioCtx.resume().catch(() => {});
        if (audioCtx.state === "suspended") {
          const resume = () => void audioCtx?.resume().catch(() => {});
          window.addEventListener("pointerdown", resume, { once: true });
          window.addEventListener("keydown", resume, { once: true });
          removeGestureListeners = () => {
            window.removeEventListener("pointerdown", resume);
            window.removeEventListener("keydown", resume);
          };
        }

        const samples = new Uint8Array(analyser.fftSize);
        let smoothed = 0;
        let lastPush = 0;

        const tick = (now: number) => {
          if (cancelled || !analyser) return;
          analyser.getByteTimeDomainData(samples);
          let sumSquares = 0;
          for (let i = 0; i < samples.length; i += 1) {
            const deviation = (samples[i] - 128) / 128;
            sumSquares += deviation * deviation;
          }
          const rms = Math.sqrt(sumSquares / samples.length);
          const scaled = Math.min(1, rms * 3.2);
          smoothed = scaled > smoothed ? scaled : smoothed * 0.82 + scaled * 0.18;

          if (now - lastPush >= METER_INTERVAL) {
            lastPush = now;
            setMicLevel(smoothed);
            if (smoothed >= SIGNAL_THRESHOLD) setMicSignalDetected(true);
          }
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      } catch {
        // Meter unavailable -- the mic itself is still usable.
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      removeGestureListeners?.();
      try {
        source?.disconnect();
        analyser?.disconnect();
        gain?.disconnect();
      } catch {
        // no-op
      }
      if (audioCtx && audioCtx.state !== "closed") void audioCtx.close().catch(() => {});
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [attempt]);

  return { status, micLevel, micSignalDetected, retry };
};

export default useMicCheck;
