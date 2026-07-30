"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DeviceCheckStatus = "checking" | "ready" | "denied" | "unavailable";

type DeviceCheckState = {
  status: DeviceCheckStatus;
  cameraOn: boolean;
  micOn: boolean;
};

/** Level at which we consider the mic to be picking up real sound (0..1). */
const SIGNAL_THRESHOLD = 0.045;
/** How often the meter pushes a new level into React state (ms). */
const METER_INTERVAL = 60;

const isDenied = (error: unknown) => {
  const name = (error as { name?: string })?.name;
  return name === "NotAllowedError" || name === "SecurityError";
};

/**
 * Requests camera + mic for a pre-join preview and drives a live mic level.
 *
 * Deliberately forgiving: `getUserMedia` being missing entirely (insecure
 * origin, ancient browser), being denied, or only one of the two devices being
 * available all resolve to a rendered state -- this hook never throws and never
 * leaves the caller stuck on "checking".
 */
const useDeviceCheck = () => {
  const [{ status, cameraOn, micOn }, setState] = useState<DeviceCheckState>({
    status: "checking",
    cameraOn: false,
    micOn: false,
  });
  const [micLevel, setMicLevel] = useState(0);
  const [micSignalDetected, setMicSignalDetected] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const retry = useCallback(() => {
    setMicLevel(0);
    setMicSignalDetected(false);
    setState({ status: "checking", cameraOn: false, micOn: false });
    setAttempt(a => a + 1);
  }, []);

  useEffect(() => {
    // Captured once: refs can point elsewhere by the time cleanup runs.
    const videoEl = videoRef.current;
    let cancelled = false;
    let rafId = 0;
    let audioCtx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let gain: GainNode | null = null;
    let stream: MediaStream | null = null;
    let removeGestureListeners: (() => void) | undefined;

    /** Ask for both devices at once, then fall back to asking separately so a
     * working camera still previews when the mic is missing/blocked (and vice
     * versa) instead of failing the whole check. */
    const acquire = async () => {
      const mediaDevices =
        typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
      if (!mediaDevices?.getUserMedia) {
        return { stream: null as MediaStream | null, unsupported: true, denied: false };
      }

      try {
        const both = await mediaDevices.getUserMedia({ video: true, audio: true });
        return { stream: both, unsupported: false, denied: false };
      } catch (combinedError) {
        const merged = new MediaStream();
        let denied = isDenied(combinedError);

        for (const constraints of [{ video: true }, { audio: true }]) {
          try {
            const partial = await mediaDevices.getUserMedia(constraints);
            partial.getTracks().forEach(track => merged.addTrack(track));
          } catch (partialError) {
            if (isDenied(partialError)) denied = true;
          }
        }

        if (!merged.getTracks().length) {
          return { stream: null as MediaStream | null, unsupported: false, denied };
        }
        return { stream: merged, unsupported: false, denied: false };
      }
    };

    /** The meter is a nice-to-have: any Web Audio failure leaves the bars flat
     * rather than breaking the join flow. */
    const startMeter = (activeStream: MediaStream) => {
      if (!activeStream.getAudioTracks().length) return;
      const AudioCtor =
        typeof window !== "undefined"
          ? window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext
          : undefined;
      if (!AudioCtor) return;

      try {
        audioCtx = new AudioCtor();
        source = audioCtx.createMediaStreamSource(activeStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        // Route through a silent gain node so the graph is always pulled --
        // some browsers won't process an analyser with no path to destination.
        gain = audioCtx.createGain();
        gain.gain.value = 0;
        source.connect(analyser);
        analyser.connect(gain);
        gain.connect(audioCtx.destination);

        // Autoplay policies can leave the context suspended until a gesture.
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
          // Scale up: normal speech RMS sits well below 0.3.
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

    const run = async () => {
      const result = await acquire();
      if (cancelled) {
        result.stream?.getTracks().forEach(track => track.stop());
        return;
      }

      stream = result.stream;

      if (!stream) {
        setState({
          status: result.denied ? "denied" : "unavailable",
          cameraOn: false,
          micOn: false,
        });
        return;
      }

      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      setState({ status: "ready", cameraOn: hasVideo, micOn: hasAudio });

      // A device can disappear mid-check (unplugged webcam, OS-level mute).
      stream.getTracks().forEach(track => {
        track.addEventListener("ended", () => {
          if (cancelled) return;
          setState(prev => ({
            ...prev,
            cameraOn: track.kind === "video" ? false : prev.cameraOn,
            micOn: track.kind === "audio" ? false : prev.micOn,
          }));
        });
      });

      if (videoEl && hasVideo) {
        videoEl.srcObject = stream;
        // Autoplay can reject on some browsers; the `autoPlay` attribute is the
        // primary mechanism, this is just a nudge.
        void videoEl.play().catch(() => {});
      }
      startMeter(stream);
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
      if (videoEl) videoEl.srcObject = null;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [attempt]);

  return {
    /** Attach to the preview `<video>` element. */
    videoRef,
    status,
    cameraOn,
    micOn,
    /** Smoothed 0..1 input level for the animated bars. */
    micLevel,
    /** True once real sound has been picked up at least once. */
    micSignalDetected,
    retry,
  };
};

export default useDeviceCheck;
