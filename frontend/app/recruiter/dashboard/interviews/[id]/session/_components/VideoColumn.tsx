"use client";

import { useEffect, useRef, useState } from "react";
import {
  DailyAudio,
  DailyVideo,
  useDaily,
  useLocalSessionId,
  useNetwork,
  useParticipantIds,
  useAudioTrack,
  useVideoTrack,
} from "@daily-co/daily-react";
import type { ComponentRef } from "react";
import { Mic, MicOff, Signal, Video, VideoOff, Volume2, VolumeX } from "lucide-react";

import { cn } from "@/app/common/utils";

const QUALITY_BARS: Record<"good" | "low" | "very-low", number> = {
  good: 3,
  low: 2,
  "very-low": 1,
};

const QUALITY_COLOR: Record<"good" | "low" | "very-low", string> = {
  good: "bg-success",
  low: "bg-amber-400",
  "very-low": "bg-red-500",
};

const DraggablePip = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ right: 16, bottom: 16 });
  const dragState = useRef<{ startX: number; startY: number; startRight: number; startBottom: number } | null>(
    null
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, startRight: pos.right, startBottom: pos.bottom };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPos({
      right: Math.max(8, dragState.current.startRight - dx),
      bottom: Math.max(8, dragState.current.startBottom - dy),
    });
  };

  const onPointerUp = () => {
    dragState.current = null;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ right: pos.right, bottom: pos.bottom }}
      className='absolute w-[120px] h-[90px] rounded-lg overflow-hidden border border-white/30 shadow-lg cursor-grab active:cursor-grabbing z-10 bg-black'
    >
      {children}
    </div>
  );
};

const VideoColumn = ({
  roomUrl,
  token,
  candidateName,
}: {
  roomUrl: string;
  token: string;
  candidateName: string;
}) => {
  const daily = useDaily();
  const localId = useLocalSessionId();
  const remoteIds = useParticipantIds({ filter: "remote" });
  const candidateId = remoteIds[0];
  const { threshold } = useNetwork();

  const localAudio = useAudioTrack(localId);
  const localVideo = useVideoTrack(localId);
  const audioRef = useRef<ComponentRef<typeof DailyAudio>>(null);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinAttempt, setJoinAttempt] = useState(0);

  // A failed join used to be swallowed silently here, leaving the recruiter
  // staring at "Waiting for the candidate to join..." forever with no
  // indication their OWN join attempt is what actually failed (e.g. an
  // expired/invalid Daily.co token, or the room not existing yet) and no way
  // to recover without a full page reload.
  useEffect(() => {
    if (!daily || joined) return;
    setJoinError(null);
    daily
      .join({ url: roomUrl, token, userName: "Recruiter" })
      .then(() => setJoined(true))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Could not join the interview room.";
        setJoinError(message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daily, roomUrl, token, joinAttempt]);

  const toggleMic = () => daily?.setLocalAudio(!!localAudio?.isOff);
  const toggleCamera = () => daily?.setLocalVideo(!!localVideo?.isOff);
  const toggleSpeaker = () => {
    const next = !speakerMuted;
    setSpeakerMuted(next);
    audioRef.current?.getAllAudio().forEach(el => {
      el.muted = next;
    });
  };

  return (
    <div className='relative w-full h-full flex flex-col'>
      <div className='relative flex-1 min-h-0 bg-black flex items-center justify-center'>
        {joinError ? (
          <div className='flex flex-col items-center gap-3 text-white/80 text-center px-6'>
            <p className='text-sm font-medium'>Could not join the interview room</p>
            <p className='text-xs text-white/50 max-w-sm'>{joinError}</p>
            <button
              type='button'
              onClick={() => setJoinAttempt(n => n + 1)}
              className='btn btn-sm btn-primary text-white rounded-lg'
            >
              Retry
            </button>
          </div>
        ) : !joined ? (
          <div className='flex flex-col items-center gap-2 text-white/50'>
            <span className='loading loading-dots loading-md' />
            <p className='text-sm'>Connecting to the room...</p>
          </div>
        ) : candidateId ? (
          <DailyVideo sessionId={candidateId} type='video' fit='cover' className='w-full h-full object-cover' />
        ) : (
          <div className='flex flex-col items-center gap-2 text-white/50'>
            <span className='loading loading-dots loading-md' />
            <p className='text-sm'>Waiting for {candidateName || "the candidate"} to join...</p>
          </div>
        )}

        {localId && (
          <DraggablePip>
            <DailyVideo sessionId={localId} type='video' mirror muted fit='cover' className='w-full h-full object-cover' />
          </DraggablePip>
        )}
        <DailyAudio ref={audioRef} />
      </div>

      <div className='h-11 shrink-0 bg-black/70 backdrop-blur-sm flex items-center justify-center gap-3 px-3'>
        <button
          type='button'
          onClick={toggleMic}
          aria-label='Toggle microphone'
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            localAudio?.isOff ? "bg-red-600 text-white" : "bg-white/10 text-white"
          )}
        >
          {localAudio?.isOff ? <MicOff className='w-4 h-4' /> : <Mic className='w-4 h-4' />}
        </button>
        <button
          type='button'
          onClick={toggleCamera}
          aria-label='Toggle camera'
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            localVideo?.isOff ? "bg-red-600 text-white" : "bg-white/10 text-white"
          )}
        >
          {localVideo?.isOff ? <VideoOff className='w-4 h-4' /> : <Video className='w-4 h-4' />}
        </button>
        <button
          type='button'
          onClick={toggleSpeaker}
          aria-label='Toggle speaker'
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            speakerMuted ? "bg-red-600 text-white" : "bg-white/10 text-white"
          )}
        >
          {speakerMuted ? <VolumeX className='w-4 h-4' /> : <Volume2 className='w-4 h-4' />}
        </button>
        <div className='flex items-center gap-1 ml-1' title={`Connection: ${threshold}`}>
          <Signal className='w-3.5 h-3.5 text-white/50' />
          <div className='flex items-end gap-0.5 h-3'>
            {[1, 2, 3].map(bar => (
              <span
                key={bar}
                style={{ height: `${bar * 4}px` }}
                className={cn(
                  "w-1 rounded-sm",
                  bar <= QUALITY_BARS[threshold] ? QUALITY_COLOR[threshold] : "bg-white/20"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoColumn;
