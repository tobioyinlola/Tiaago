"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, Search } from "lucide-react";

import { ID, TranscriptSegment } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import { getInterviewTranscript } from "@/app/common/services/interview-review";

const formatTimestamp = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const SPEAKER_LABEL: Record<TranscriptSegment["speaker"], string> = {
  RECRUITER: "Recruiter",
  CANDIDATE: "Candidate",
  UNKNOWN: "Unknown",
};

const SPEAKER_COLOR: Record<TranscriptSegment["speaker"], string> = {
  RECRUITER: "text-deep-blue",
  CANDIDATE: "text-success",
  UNKNOWN: "text-secondary-black",
};

const highlight = (text: string, query: string, isActive: boolean) => {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark id={isActive ? "review-transcript-active" : undefined} className={cn("rounded-sm", isActive ? "bg-amber-400" : "bg-amber-200")}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
};

const downloadTxt = (segments: TranscriptSegment[]) => {
  const content = segments
    .map(s => `[${formatTimestamp(s.start_ms)}] ${SPEAKER_LABEL[s.speaker]}: ${s.text}`)
    .join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "interview-transcript.txt";
  a.click();
  URL.revokeObjectURL(url);
};

const TranscriptReviewTab = ({ interviewId }: { interviewId: ID }) => {
  const [segments, setSegments] = useState<TranscriptSegment[] | null>(null);
  const [query, setQuery] = useState("");
  const [activeMatch, setActiveMatch] = useState(0);
  const [prevQuery, setPrevQuery] = useState("");
  if (query !== prevQuery) {
    setPrevQuery(query);
    setActiveMatch(0);
  }

  useEffect(() => {
    getInterviewTranscript(interviewId).then(res => {
      if (res.success) setSegments(res.data.segments as TranscriptSegment[]);
    });
  }, [interviewId]);

  const matchIndices = useMemo(() => {
    if (!segments || !query) return [];
    const lower = query.toLowerCase();
    return segments.reduce<number[]>((acc, s, i) => {
      if (s.text.toLowerCase().includes(lower)) acc.push(i);
      return acc;
    }, []);
  }, [segments, query]);

  useEffect(() => {
    if (!query) return;
    document.getElementById("review-transcript-active")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeMatch, query]);

  const goToMatch = (direction: 1 | -1) => {
    if (!matchIndices.length) return;
    setActiveMatch(prev => (prev + direction + matchIndices.length) % matchIndices.length);
  };

  if (!segments) {
    return <p className='text-sm text-secondary-black'>Loading transcript...</p>;
  }

  if (!segments.length) {
    return <p className='text-sm text-secondary-black'>No transcript was captured for this interview.</p>;
  }

  const activeSegmentIndex = matchIndices[activeMatch];

  return (
    <div className='max-w-3xl flex flex-col gap-4'>
      <div className='flex items-center gap-2'>
        <div className='relative flex-1 max-w-xs'>
          <Search className='w-3.5 h-3.5 text-secondary-black absolute left-2.5 top-1/2 -translate-y-1/2' />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Search transcript'
            className='input input-sm input-bordered w-full pl-7 text-sm'
          />
        </div>
        {query && (
          <div className='flex items-center gap-1'>
            <span className='text-xs text-secondary-black tabular-nums'>
              {matchIndices.length ? `${activeMatch + 1}/${matchIndices.length}` : "0/0"}
            </span>
            <button type='button' onClick={() => goToMatch(-1)} className='p-1 rounded hover:bg-white'>
              <ChevronUp className='w-4 h-4' />
            </button>
            <button type='button' onClick={() => goToMatch(1)} className='p-1 rounded hover:bg-white'>
              <ChevronDown className='w-4 h-4' />
            </button>
          </div>
        )}
        <button
          type='button'
          onClick={() => downloadTxt(segments)}
          className='btn btn-sm btn-outline rounded-lg gap-1.5 ml-auto'
        >
          <Download className='w-3.5 h-3.5' /> Download .txt
        </button>
      </div>

      <div className='bg-white border border-[#EAECF0] rounded-2lg p-5 flex flex-col gap-4'>
        {segments.map((segment, i) => (
          <div key={segment.id}>
            <div className='flex items-baseline gap-2'>
              <span className={cn("text-xs font-semibold", SPEAKER_COLOR[segment.speaker])}>
                {SPEAKER_LABEL[segment.speaker]}
              </span>
              <span className='text-[10px] text-secondary-black tabular-nums'>{formatTimestamp(segment.start_ms)}</span>
            </div>
            <p className='text-sm text-primaryBlack mt-0.5'>
              {highlight(segment.text, query, i === activeSegmentIndex)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TranscriptReviewTab;
