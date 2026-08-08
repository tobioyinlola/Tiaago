"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Room,
  RoomEvent,
  Track,
  type LocalTrackPublication,
  type Participant,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type TranscriptionSegment,
} from "livekit-client";
import { MessageSquareText, Mic, MicOff, Phone, Video, X } from "lucide-react";

import Modal from "@/app/common/components/Modal";
import DaisyButton from "@/app/common/components/DaisyButton";
import BrandLink from "@/app/common/components/BrandLink";
import ProctoringWarningOverlay from "@/app/common/components/dashboard/ProctoringWarningOverlay";
import ProctoringViolationBanner from "@/app/common/components/dashboard/ProctoringViolationBanner";
import { useProctoring } from "@/app/common/hooks/useProctoring";
import {
  createProctoringSession,
  completeProctoringSession,
} from "@/app/common/services/assessment-invite-client";
import { cn } from "@/app/common/utils";
import AlexAvatar from "../../_components/AlexAvatar";
import AIInterviewCompletion from "./AIInterviewCompletion";
import { AI_INTERVIEW_SESSION_STORAGE_KEY, type AIInterviewSessionData } from "../session.constants";

type Phase = "connecting" | "live" | "reconnecting" | "ended" | "error";

type TranscriptEntry = {
  id: string;
  speaker: "alex" | "you";
  text: string;
  final: boolean;
};

const formatElapsed = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const AIInterviewLiveSession = ({ token }: { token: string }) => {
  const router = useRouter();
  const [session, setSession] = useState<AIInterviewSessionData | null>(null);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [errorMessage, setErrorMessage] = useState("");
  const [alexSpeaking, setAlexSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [caption, setCaption] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [reconnectingLong, setReconnectingLong] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [proctoringSessionId, setProctoringSessionId] = useState<string | null>(null);
  const [terminationReason, setTerminationReason] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const alexAudioRef = useRef<HTMLAudioElement | null>(null);
  const candidateVideoRef = useRef<HTMLVideoElement | null>(null);
  const endModalRef = useRef<HTMLDialogElement>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const proctoringSessionIdRef = useRef<string | null>(null);

  // Load the token minted by the pre-join page. This page is never reached
  // directly -- no session data means the candidate skipped the setup step
  // (or refreshed after it expired), so send them back to try again.
  useEffect(() => {
    const raw = window.sessionStorage.getItem(AI_INTERVIEW_SESSION_STORAGE_KEY);
    if (!raw) {
      router.replace(`/ai-interview/${token}`);
      return;
    }
    try {
      setSession(JSON.parse(raw) as AIInterviewSessionData);
    } catch {
      router.replace(`/ai-interview/${token}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (showEndConfirm) endModalRef.current?.showModal();
    else endModalRef.current?.close();
  }, [showEndConfirm]);

  // Auto-scroll the transcript panel to the newest line.
  useEffect(() => {
    if (transcriptOpen) transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [transcript, transcriptOpen]);

  // Marks the proctoring session complete (or terminated) exactly once,
  // whichever way the call actually ends -- natural goodbye, the candidate
  // clicking "End interview", or a forced end from a critical violation
  // (see the onForceSubmit wiring on useProctoring below, which sets
  // terminationReason before this fires).
  useEffect(() => {
    if (phase !== "ended") return;
    const sessionId = proctoringSessionIdRef.current;
    if (sessionId) completeProctoringSession(token, sessionId, terminationReason || undefined, "ai-interview");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const {
    tabSwitchCount,
    showViolationBanner,
    showTabReturnOverlay,
    dismissTabReturnOverlay,
    showFullscreenOverlay,
    requestReturnToFullscreen,
    showDevtoolsOverlay,
    dismissDevtoolsOverlay,
  } = useProctoring({
    token,
    sessionId: proctoringSessionId,
    settings: session?.proctoringSettings ?? null,
    basePath: "ai-interview",
    onForceSubmit: reason => {
      setTerminationReason(reason);
      void roomRef.current?.disconnect();
      setPhase("ended");
    },
  });

  useEffect(() => {
    if (!session) return;

    // Guards against a malformed/incomplete session object reaching
    // room.connect (e.g. LIVEKIT_URL unset server-side, or a stale/corrupted
    // sessionStorage entry) -- livekit-client's connect throws an opaque
    // low-level TypeError in that case instead of a readable message.
    if (!session.livekitUrl || !session.token) {
      setErrorMessage("This interview session is incomplete. Please go back and try again.");
      setPhase("error");
      return;
    }

    const room = new Room();
    roomRef.current = room;
    let cancelled = false;

    const onTrackSubscribed = (track: RemoteTrack, _pub: RemoteTrackPublication, _participant: RemoteParticipant) => {
      // Only ever one remote participant (Alex) in this room -- no need to
      // branch on who published it.
      if (track.kind !== Track.Kind.Audio) return;
      const el = track.attach() as HTMLAudioElement;
      el.autoplay = true;
      alexAudioRef.current = el;
    };

    const onActiveSpeakersChanged = (speakers: Participant[]) => {
      const localIdentity = room.localParticipant.identity;
      setAlexSpeaking(speakers.some(p => p.identity !== localIdentity));
    };

    const onTranscription = (segments: TranscriptionSegment[], participant?: Participant) => {
      const isLocal = !!participant && participant.identity === room.localParticipant.identity;
      const speaker: TranscriptEntry["speaker"] = isLocal ? "you" : "alex";

      // Alex's live caption, shown big under the avatar -- only the latest
      // finalized-or-interim line, same as before.
      if (!isLocal) {
        const latest = segments[segments.length - 1];
        if (latest) setCaption(latest.text);
      }

      // Full running transcript, both speakers -- LiveKit sends interim
      // results that refine in place (same segment id) before settling on
      // `final: true`, so upsert by id instead of appending duplicates.
      setTranscript(prev => {
        const next = [...prev];
        for (const seg of segments) {
          if (!seg.text) continue;
          const idx = next.findIndex(e => e.id === seg.id);
          const entry: TranscriptEntry = { id: seg.id, speaker, text: seg.text, final: seg.final };
          if (idx >= 0) next[idx] = entry;
          else next.push(entry);
        }
        return next;
      });
    };

    const onConnected = () => {
      if (cancelled) return;
      setPhase("live");
      void room.localParticipant.setMicrophoneEnabled(true);
      if (session.cameraEnabled) {
        void room.localParticipant.setCameraEnabled(true);
        setCameraOn(true);
      }
      if (session.proctoringSettings.require_fullscreen) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
      createProctoringSession(token, "ai-interview").then(result => {
        if (cancelled || !result) return;
        proctoringSessionIdRef.current = result.sessionId;
        setProctoringSessionId(result.sessionId);
      });
    };

    const onReconnecting = () => {
      setPhase("reconnecting");
      reconnectTimeoutRef.current = setTimeout(() => setReconnectingLong(true), 60000);
    };

    const onReconnected = () => {
      setPhase("live");
      setReconnectingLong(false);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };

    const onDisconnected = () => {
      if (cancelled) return;
      setPhase(prev => (prev === "error" ? prev : "ended"));
    };

    const onParticipantDisconnected = () => {
      // Alex left -- the interview is over on the agent's side.
      setPhase("ended");
    };

    const onLocalTrackPublished = (publication: LocalTrackPublication) => {
      const track = publication.track;
      if (!track || track.kind !== Track.Kind.Video || !candidateVideoRef.current) return;
      track.attach(candidateVideoRef.current);
    };

    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);
    room.on(RoomEvent.TranscriptionReceived, onTranscription);
    room.on(RoomEvent.Connected, onConnected);
    room.on(RoomEvent.Reconnecting, onReconnecting);
    room.on(RoomEvent.Reconnected, onReconnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    room.on(RoomEvent.LocalTrackPublished, onLocalTrackPublished);

    room.connect(session.livekitUrl, session.token).catch(error => {
      if (cancelled) return;
      setErrorMessage(error instanceof Error ? error.message : "Could not connect to the interview.");
      setPhase("error");
    });

    return () => {
      cancelled = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
      room.off(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);
      room.off(RoomEvent.TranscriptionReceived, onTranscription);
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.Reconnecting, onReconnecting);
      room.off(RoomEvent.Reconnected, onReconnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
      room.off(RoomEvent.LocalTrackPublished, onLocalTrackPublished);
      void room.disconnect();
      window.sessionStorage.removeItem(AI_INTERVIEW_SESSION_STORAGE_KEY);
    };
  }, [session, token]);

  // Elapsed timer while the call is actually live.
  useEffect(() => {
    if (phase !== "live") return;
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const toggleMute = () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !muted;
    setMuted(next);
    void room.localParticipant.setMicrophoneEnabled(!next);
  };

  const enableCamera = () => {
    const room = roomRef.current;
    if (!room) return;
    setCameraOn(true);
    void room.localParticipant.setCameraEnabled(true);
  };

  const confirmEnd = () => {
    setShowEndConfirm(false);
    void roomRef.current?.disconnect();
    setPhase("ended");
  };

  if (!session) return null;

  if (phase === "ended") {
    return <AIInterviewCompletion candidateFirstName={session.candidateFirstName} />;
  }

  if (phase === "error") {
    return (
      <div className='min-h-[100svh] w-full bg-white flex flex-col items-center justify-center px-6 text-center'>
        <p className='text-lg font-semibold text-primary-black mb-2'>We couldn&apos;t connect you to the interview.</p>
        <p className='text-secondary-black mb-6'>{errorMessage || "Please try again."}</p>
        <DaisyButton color='primary' onClick={() => router.replace(`/ai-interview/${token}`)}>
          Back to setup
        </DaisyButton>
      </div>
    );
  }

  const durationSeconds = session.durationMinutes * 60;
  const amberAt = durationSeconds * 0.8;
  const redAt = durationSeconds * 0.9;
  const timerTone = elapsed >= redAt ? "text-error" : elapsed >= amberAt ? "text-amber-600" : "text-primary-black";
  const candidateInitial = (session.candidateFirstName || "?").charAt(0).toUpperCase();

  return (
    <div className='h-[100svh] w-full bg-white flex flex-col overflow-hidden'>
      {(phase === "connecting" || phase === "reconnecting") && (
        <div className='fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-4 text-primary-black'>
          <span className='loading loading-spinner loading-lg text-primary' />
          {phase === "reconnecting" ? (
            <>
              <p className='font-semibold'>Connection interrupted</p>
              <p className='text-secondary-black text-sm'>Trying to reconnect...</p>
              {reconnectingLong && (
                <DaisyButton
                  color='primary'
                  className='mt-2'
                  onClick={() => router.replace(`/ai-interview/${token}`)}
                >
                  Rejoin interview
                </DaisyButton>
              )}
            </>
          ) : (
            <p className='text-secondary-black text-sm'>Connecting you with Alex...</p>
          )}
        </div>
      )}

      {showViolationBanner && <ProctoringViolationBanner count={tabSwitchCount} />}
      <ProctoringWarningOverlay
        open={showTabReturnOverlay}
        title="Welcome back"
        message="We noticed you left the interview tab. Please stay on this tab for the rest of the interview."
        actionLabel="I'm back"
        onAction={dismissTabReturnOverlay}
      />
      <ProctoringWarningOverlay
        open={showFullscreenOverlay}
        title='Please return to fullscreen'
        message='This interview must be taken in fullscreen mode. Exiting fullscreen has been recorded.'
        actionLabel='Return to fullscreen'
        onAction={requestReturnToFullscreen}
      />
      <ProctoringWarningOverlay
        open={showDevtoolsOverlay}
        title='Developer tools detected'
        message='Browser developer tools have been detected. This has been recorded.'
        actionLabel='Continue'
        onAction={dismissDevtoolsOverlay}
      />

      {/* Top bar */}
      <div className='h-14 shrink-0 bg-white border-b border-[#EAECF0] flex items-center justify-between px-4 sm:px-6 relative z-10'>
        <div className='pointer-events-none [&_svg]:h-6 [&_svg]:w-auto sm:[&_svg]:h-7'>
          <BrandLink containerClassName='block' />
        </div>
        <span className='hidden sm:block text-xs text-secondary-black truncate max-w-[40%]'>
          {session.questionsTotal} questions &middot; {session.jobTitle} at {session.companyName}
        </span>
        <span className={cn("text-sm font-mono tabular-nums font-semibold", timerTone)}>{formatElapsed(elapsed)}</span>
      </div>
      <div className='h-1 bg-[#EAECF0] shrink-0'>
        <div
          className='h-full bg-primary transition-all duration-1000'
          style={{ width: `${Math.min(100, (elapsed / durationSeconds) * 100)}%` }}
        />
      </div>

      {/* Stage */}
      <div className='flex-1 flex min-h-0 relative'>
        <div className='flex-1 relative flex flex-col items-center justify-center px-4 py-6 overflow-hidden bg-gradient-to-b from-primary/[0.03] to-white'>
          {/* Ambient background glow */}
          <div className='pointer-events-none absolute inset-0 overflow-hidden'>
            <div
              className={cn(
                "absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl transition-opacity duration-700",
                alexSpeaking ? "opacity-100" : "opacity-40"
              )}
            />
          </div>

          <div className='relative flex flex-col items-center gap-5'>
            <AlexAvatar
              className='h-36 w-36 sm:h-44 sm:w-44'
              ringClassName={cn(
                "p-1.5 transition-shadow duration-300",
                alexSpeaking
                  ? "ring-4 ring-primary shadow-[0_0_0_10px_rgba(84,101,255,0.15)] animate-pulse"
                  : "ring-2 ring-[#EAECF0]"
              )}
            />
            <div className='text-center'>
              <p className='text-primary-black font-semibold text-lg'>Alex</p>
              <p className='text-secondary-black text-sm'>AI Interviewer &middot; Tiaago</p>
            </div>
            {!alexSpeaking && phase === "live" && (
              <div className='flex items-center gap-2 text-secondary-black text-xs'>
                <span className='flex gap-0.5'>
                  <span className='h-2 w-1 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.2s]' />
                  <span className='h-2 w-1 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.1s]' />
                  <span className='h-2 w-1 bg-primary/70 rounded-full animate-bounce' />
                </span>
                Listening...
              </div>
            )}
          </div>

          {/* Candidate self-view -- picture-in-picture, bottom-right of the stage */}
          <div className='absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col items-center gap-2 rounded-2xl bg-white border border-[#EAECF0] shadow-sm p-3 w-28 sm:w-36'>
            {cameraOn ? (
              <div className='h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden bg-black ring-2 ring-[#EAECF0]'>
                <video ref={candidateVideoRef} autoPlay muted playsInline className='h-full w-full object-cover' />
              </div>
            ) : (
              <div className='h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary flex items-center justify-center ring-2 ring-[#EAECF0]'>
                <span className='text-white text-lg font-bold'>{candidateInitial}</span>
              </div>
            )}
            <p className='text-primary-black text-xs truncate max-w-full'>{session.candidateFirstName || "You"}</p>
            {!session.cameraEnabled && !cameraOn && (
              <button
                type='button'
                onClick={enableCamera}
                className='flex items-center gap-1 text-[11px] text-secondary-black hover:text-primary transition-colors'
              >
                <Video className='h-3 w-3' /> Camera
              </button>
            )}
          </div>

          {/* Captions */}
          {captionsOn && caption && (
            <div className='absolute bottom-0 left-0 right-0 px-6 pb-4 flex justify-center'>
              <div className='max-w-2xl bg-primary text-white text-sm rounded-lg px-4 py-2 text-center shadow-md'>
                {caption}
              </div>
            </div>
          )}
        </div>

        {/* Live transcript panel */}
        <div
          className={cn(
            "shrink-0 border-l border-[#EAECF0] bg-[#F9FAFB] flex flex-col transition-all duration-300 overflow-hidden",
            transcriptOpen ? "w-full sm:w-80 absolute sm:relative inset-0 sm:inset-auto z-20" : "w-0"
          )}
        >
          <div className='flex items-center justify-between px-4 h-12 border-b border-[#EAECF0] shrink-0 bg-white'>
            <p className='text-primary-black text-sm font-semibold'>Transcript</p>
            <button
              type='button'
              onClick={() => setTranscriptOpen(false)}
              className='text-secondary-black hover:text-primary-black transition-colors'
              aria-label='Close transcript'
            >
              <X className='h-4 w-4' />
            </button>
          </div>
          <div className='flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0'>
            {transcript.length === 0 ? (
              <p className='text-secondary-black text-sm text-center mt-8'>
                Your conversation with Alex will appear here as you talk.
              </p>
            ) : (
              transcript.map(entry => (
                <div
                  key={entry.id}
                  className={cn("max-w-[90%] flex flex-col gap-0.5", entry.speaker === "you" ? "self-end items-end" : "self-start items-start")}
                >
                  <span className='text-[10px] uppercase tracking-wide text-secondary-black'>
                    {entry.speaker === "you" ? session.candidateFirstName || "You" : "Alex"}
                  </span>
                  <p
                    className={cn(
                      "text-sm rounded-xl px-3 py-2 leading-relaxed",
                      entry.speaker === "you" ? "bg-primary text-white" : "bg-white border border-[#EAECF0] text-primary-black",
                      !entry.final && "opacity-60 italic"
                    )}
                  >
                    {entry.text}
                  </p>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>

      {muted && (
        <div className='px-6 pb-2 shrink-0'>
          <div className='max-w-md mx-auto bg-amber-500 text-white text-xs font-medium rounded-lg px-3 py-2 text-center'>
            Alex can&apos;t hear you -- tap to unmute
          </div>
        </div>
      )}

      {/* Controls */}
      <div className='shrink-0 flex items-center justify-center gap-5 py-5 px-4 relative border-t border-[#EAECF0] bg-white/80 backdrop-blur-sm'>
        <button
          type='button'
          onClick={toggleMute}
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-105 active:scale-95",
            muted ? "bg-error text-white" : "bg-primary/10 text-primary-black hover:bg-primary/20"
          )}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className='h-5 w-5' /> : <Mic className='h-5 w-5' />}
        </button>

        <button
          type='button'
          onClick={() => setShowEndConfirm(true)}
          className='h-14 w-14 rounded-full bg-error text-white flex items-center justify-center shadow-lg shadow-error/30 transition-all hover:scale-105 hover:bg-error/90 active:scale-95'
          aria-label='End interview'
        >
          <Phone className='h-6 w-6 rotate-[135deg]' fill='currentColor' />
        </button>

        <button
          type='button'
          onClick={() => setTranscriptOpen(o => !o)}
          className={cn(
            "absolute left-4 h-9 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors",
            transcriptOpen ? "bg-primary/15 text-primary" : "bg-[#F5F6F7] text-secondary-black hover:text-primary-black"
          )}
        >
          <MessageSquareText className='h-3.5 w-3.5' /> <span className='hidden sm:inline'>Transcript</span>
        </button>

        <button
          type='button'
          onClick={() => setCaptionsOn(c => !c)}
          className={cn(
            "absolute right-4 h-9 px-3 rounded-full text-xs font-semibold flex items-center justify-center transition-colors",
            captionsOn ? "bg-primary/15 text-primary" : "bg-[#F5F6F7] text-secondary-black"
          )}
        >
          CC
        </button>
      </div>

      <Modal id='ai-interview-end-confirm' modalRef={endModalRef} disableBackdropClick>
        <div className='bg-white rounded-xl p-6 text-center'>
          <div className='mx-auto w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-4'>
            <X className='h-6 w-6 text-error' />
          </div>
          <h3 className='text-lg font-bold text-primary-black mb-2'>End the interview?</h3>
          <p className='text-sm text-secondary-black mb-6'>
            You won&apos;t be able to rejoin once you end this interview.
          </p>
          <div className='flex items-center justify-center gap-3'>
            <DaisyButton color='neutral' variant='outline' onClick={() => setShowEndConfirm(false)}>
              Keep going
            </DaisyButton>
            <DaisyButton color='error' className='text-white' onClick={confirmEnd}>
              End interview
            </DaisyButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AIInterviewLiveSession;
