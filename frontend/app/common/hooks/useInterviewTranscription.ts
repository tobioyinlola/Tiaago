"use client";

import type { DailyCall, DailyEventObjectTrack } from "@daily-co/daily-js";
import { useCallback, useEffect, useRef, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

import {
  CompetencyEvidence,
  CopilotSuggestionEvent,
  TranscriptSegment,
  TranscriptSpeaker,
} from "@/app/common/types";
import { arrayBufferToBase64, encodeWAV, mergeFloat32Arrays } from "@/app/common/utils/audio-processing";

const CHUNK_DURATION_MS = 10_000;
const SAMPLE_RATE = 16000;

type SpeakerCapture = {
  audioContext: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  silentGain: GainNode;
  buffer: Float32Array[];
  chunkStartMs: number;
};

/** Captures both the local (recruiter) and remote (candidate) audio tracks
 * from an already-joined Daily call, relays ~10s WAV chunks per speaker to
 * the interview's transcription WebSocket, and exposes the live transcript /
 * copilot-suggestion / evidence state that arrives back over it.
 *
 * Only the recruiter's browser (this workspace) ever opens this socket --
 * Daily gives one side access to both parties' audio tracks in the same
 * call object, so there's no need for the candidate's browser to connect
 * separately. */
export const useInterviewTranscription = ({
  wsUrl,
  accessToken,
  call,
  startedAt,
  enabled,
}: {
  wsUrl: string | null;
  accessToken: string;
  call: DailyCall | null;
  startedAt: number;
  enabled: boolean;
}) => {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [suggestions, setSuggestions] = useState<CopilotSuggestionEvent[]>([]);
  const [evidenceByCompetency, setEvidenceByCompetency] = useState<Record<string, CompetencyEvidence[]>>({});

  const captures = useRef<Partial<Record<TranscriptSpeaker, SpeakerCapture>>>({});

  const socketUrl = enabled && wsUrl && accessToken ? `${wsUrl}?token=${accessToken}` : null;
  const { sendMessage, readyState } = useWebSocket(socketUrl, {
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
    onMessage: event => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "TRANSCRIPT_SEGMENT") {
          setSegments(prev => [...prev, data.segment as TranscriptSegment]);
        } else if (data.type === "COPILOT_SUGGESTION") {
          setSuggestions(prev => [...prev, data.event as CopilotSuggestionEvent]);
        } else if (data.type === "EVIDENCE_UPDATE") {
          setEvidenceByCompetency(prev => ({
            ...prev,
            [data.competency_id]: data.evidence as CompetencyEvidence[],
          }));
        }
      } catch {
        // Ignore malformed frames -- the live transcript/suggestions just miss one update.
      }
    },
  });

  const flushChunk = useCallback(
    (speaker: TranscriptSpeaker) => {
      const capture = captures.current[speaker];
      if (!capture || capture.buffer.length === 0) return;
      const merged = mergeFloat32Arrays(capture.buffer);
      capture.buffer = [];
      const chunkStartMs = capture.chunkStartMs;
      capture.chunkStartMs = Date.now() - startedAt;

      const wav = encodeWAV(merged, capture.audioContext.sampleRate);
      const audio_base64 = arrayBufferToBase64(wav);
      sendMessage(
        JSON.stringify({
          type: "AUDIO_CHUNK",
          speaker,
          audio_base64,
          chunk_start_ms: chunkStartMs,
        })
      );
    },
    [sendMessage, startedAt]
  );

  const stopCapture = useCallback((speaker: TranscriptSpeaker) => {
    const capture = captures.current[speaker];
    if (!capture) return;
    capture.processor.disconnect();
    capture.silentGain.disconnect();
    capture.source.disconnect();
    capture.audioContext.close().catch(() => {});
    delete captures.current[speaker];
  }, []);

  const startCapture = useCallback(
    (track: MediaStreamTrack, speaker: TranscriptSpeaker) => {
      if (captures.current[speaker]) return;
      try {
        const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
        const stream = new MediaStream([track]);
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        // Silent gain keeps the graph running without echoing captured audio
        // back out of the recruiter's speakers.
        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0;

        const capture: SpeakerCapture = {
          audioContext,
          source,
          processor,
          silentGain,
          buffer: [],
          chunkStartMs: Date.now() - startedAt,
        };
        captures.current[speaker] = capture;

        processor.onaudioprocess = event => {
          capture.buffer.push(new Float32Array(event.inputBuffer.getChannelData(0)));
        };

        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(audioContext.destination);
      } catch {
        // Mic/track access can fail (device revoked mid-call, etc.) -- the
        // interview continues without transcription for that speaker.
      }
    },
    [startedAt]
  );

  useEffect(() => {
    if (!call || !enabled) return;

    const flushIntervals = [
      setInterval(() => flushChunk("RECRUITER"), CHUNK_DURATION_MS),
      setInterval(() => flushChunk("CANDIDATE"), CHUNK_DURATION_MS),
    ];

    const attachFromParticipants = () => {
      const participants = call.participants();
      const local = participants.local;
      const localTrack = local?.tracks?.audio?.persistentTrack;
      if (localTrack) startCapture(localTrack, "RECRUITER");

      const remoteId = Object.keys(participants).find(id => id !== "local");
      const remoteTrack = remoteId ? participants[remoteId]?.tracks?.audio?.persistentTrack : undefined;
      if (remoteTrack) startCapture(remoteTrack, "CANDIDATE");
    };

    const onTrackStarted = (event?: DailyEventObjectTrack) => {
      if (!event || event.type !== "audio") return;
      const speaker: TranscriptSpeaker = event.participant?.local ? "RECRUITER" : "CANDIDATE";
      startCapture(event.track, speaker);
    };

    const onTrackStopped = (event?: DailyEventObjectTrack) => {
      if (!event || event.type !== "audio") return;
      const speaker: TranscriptSpeaker = event.participant?.local ? "RECRUITER" : "CANDIDATE";
      stopCapture(speaker);
    };

    attachFromParticipants();
    call.on("track-started", onTrackStarted);
    call.on("track-stopped", onTrackStopped);

    return () => {
      flushIntervals.forEach(clearInterval);
      call.off("track-started", onTrackStarted);
      call.off("track-stopped", onTrackStopped);
      stopCapture("RECRUITER");
      stopCapture("CANDIDATE");
    };
  }, [call, enabled, flushChunk, startCapture, stopCapture]);

  const sendActiveQuestion = useCallback(
    (text: string | null) => {
      if (readyState !== ReadyState.OPEN) return;
      sendMessage(JSON.stringify({ type: "CONTEXT_UPDATE", active_question_text: text }));
    },
    [readyState, sendMessage]
  );

  return {
    segments,
    suggestions,
    evidenceByCompetency,
    sendActiveQuestion,
    connected: readyState === ReadyState.OPEN,
  };
};
