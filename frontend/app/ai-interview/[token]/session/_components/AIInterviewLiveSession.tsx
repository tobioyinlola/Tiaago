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
import { Mic, MicOff, Phone, Video, X } from "lucide-react";

import Modal from "@/app/common/components/Modal";
import DaisyButton from "@/app/common/components/DaisyButton";
import { cn } from "@/app/common/utils";
import AlexAvatar from "../../_components/AlexAvatar";
import AIInterviewCompletion from "./AIInterviewCompletion";
import { AI_INTERVIEW_SESSION_STORAGE_KEY, type AIInterviewSessionData } from "../session.constants";

type Phase = "connecting" | "live" | "reconnecting" | "ended" | "error";

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
  const [elapsed, setElapsed] = useState(0);
  const [reconnectingLong, setReconnectingLong] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const alexAudioRef = useRef<HTMLAudioElement | null>(null);
  const candidateVideoRef = useRef<HTMLVideoElement | null>(null);
  const endModalRef = useRef<HTMLDialogElement>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // Only Alex's speech is captioned -- the candidate's own live
      // transcript (if the server ever sends one) isn't shown back to them.
      if (participant && participant.identity === room.localParticipant.identity) return;
      const latest = segments[segments.length - 1];
      if (latest) setCaption(latest.text);
    };

    const onConnected = () => {
      if (cancelled) return;
      setPhase("live");
      void room.localParticipant.setMicrophoneEnabled(true);
      if (session.cameraEnabled) {
        void room.localParticipant.setCameraEnabled(true);
        setCameraOn(true);
      }
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
  }, [session]);

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
    <div className='min-h-[100svh] w-full bg-white flex flex-col'>
      {(phase === "connecting" || phase === "reconnecting") && (
        <div className='fixed inset-0 z-50 bg-white/95 flex flex-col items-center justify-center gap-4 text-primary-black'>
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

      {/* Top bar */}
      <div className='h-12 shrink-0 bg-white border-b border-[#EAECF0] flex items-center justify-between px-4 text-primary-black'>
        <span className='text-sm font-semibold'>Tiaago</span>
        <span className='text-xs text-secondary-black'>{session.questionsTotal} questions &middot; {session.jobTitle}</span>
        <span className={cn("text-sm font-mono tabular-nums", timerTone)}>{formatElapsed(elapsed)}</span>
      </div>
      <div className='h-0.5 bg-[#EAECF0]'>
        <div
          className='h-full bg-primary transition-all duration-1000'
          style={{ width: `${Math.min(100, (elapsed / durationSeconds) * 100)}%` }}
        />
      </div>

      {/* Panels */}
      <div className='flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0'>
        <div className='lg:w-3/5 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center py-10 gap-4'>
          <AlexAvatar
            className='h-28 w-28 lg:h-32 lg:w-32'
            ringClassName={cn(
              "p-1 transition-shadow duration-300",
              alexSpeaking && "ring-4 ring-primary shadow-[0_0_0_6px_rgba(84,101,255,0.2)] animate-pulse"
            )}
          />
          <div className='text-center'>
            <p className='text-primary-black font-semibold'>Alex</p>
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

        <div className='lg:w-2/5 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center py-10 gap-3'>
          {cameraOn ? (
            <div className='h-40 w-40 rounded-full overflow-hidden bg-black'>
              <video ref={candidateVideoRef} autoPlay muted playsInline className='h-full w-full object-cover' />
            </div>
          ) : (
            <div className='h-24 w-24 rounded-full bg-primary flex items-center justify-center'>
              <span className='text-white text-2xl font-bold'>{candidateInitial}</span>
            </div>
          )}
          <p className='text-primary-black text-sm'>{session.candidateFirstName || "You"}</p>
          {!session.cameraEnabled && !cameraOn && (
            <button
              type='button'
              onClick={enableCamera}
              className='flex items-center gap-1.5 text-xs text-secondary-black hover:text-primary'
            >
              <Video className='h-3.5 w-3.5' /> Turn on camera
            </button>
          )}
        </div>
      </div>

      {/* Captions */}
      {captionsOn && caption && (
        <div className='px-6 pb-24 -mt-4'>
          <div className='max-w-3xl mx-auto bg-primary text-white text-sm rounded-lg px-4 py-2 text-center'>
            {caption}
          </div>
        </div>
      )}

      {muted && (
        <div className='px-6 -mt-4 mb-2'>
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
