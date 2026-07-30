"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Download, Search, X } from "lucide-react";

import { TranscriptSegment } from "@/app/common/types";
import { cn } from "@/app/common/utils";

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

const highlightMatches = (text: string, query: string, activeIndex: number, matchOffset: number) => {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let matchInSegment = 0;
  let idx = lower.indexOf(q, cursor);
  while (idx !== -1) {
    parts.push(text.slice(cursor, idx));
    const isActive = matchOffset + matchInSegment === activeIndex;
    parts.push(
      <mark
        key={idx}
        id={isActive ? "transcript-active-match" : undefined}
        className={cn("rounded-sm", isActive ? "bg-amber-400" : "bg-amber-200")}
      >
        {text.slice(idx, idx + query.length)}
      </mark>
    );
    cursor = idx + query.length;
    matchInSegment += 1;
    idx = lower.indexOf(q, cursor);
  }
  parts.push(text.slice(cursor));
  return parts;
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

const TranscriptTab = ({ segments }: { segments: TranscriptSegment[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [query, setQuery] = useState("");
  const [activeMatch, setActiveMatch] = useState(0);
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setActiveMatch(0);
  }

  useEffect(() => {
    if (!autoScroll || !containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [segments, autoScroll]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (!atBottom && autoScroll) setAutoScroll(false);
  };

  const matchOffsets = useMemo(() => {
    if (!query) return [];
    const lower = query.toLowerCase();
    let total = 0;
    const offsets: number[] = [];
    for (const segment of segments) {
      offsets.push(total);
      const text = segment.text.toLowerCase();
      let idx = text.indexOf(lower);
      while (idx !== -1) {
        total += 1;
        idx = text.indexOf(lower, idx + lower.length);
      }
    }
    return offsets;
  }, [segments, query]);

  const totalMatches = useMemo(() => {
    if (!query) return 0;
    const lower = query.toLowerCase();
    return segments.reduce((sum, s) => {
      let count = 0;
      const text = s.text.toLowerCase();
      let idx = text.indexOf(lower);
      while (idx !== -1) {
        count += 1;
        idx = text.indexOf(lower, idx + lower.length);
      }
      return sum + count;
    }, 0);
  }, [segments, query]);

  useEffect(() => {
    if (!query) return;
    const el = document.getElementById("transcript-active-match");
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeMatch, query, segments.length]);

  const goToMatch = (direction: 1 | -1) => {
    if (totalMatches === 0) return;
    setAutoScroll(false);
    setActiveMatch(prev => (prev + direction + totalMatches) % totalMatches);
  };

  if (!segments.length) {
    return (
      <div className='flex flex-col items-center text-center gap-2 py-10'>
        <p className='text-sm text-primaryBlack'>Live transcription will appear here during the interview.</p>
        <p className='text-xs text-secondary-black'>Transcription requires an active audio connection.</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full -m-4'>
      <div className='flex items-center gap-2 px-4 py-2 border-b border-[#EAECF0] shrink-0'>
        <div className='relative flex-1'>
          <Search className='w-3.5 h-3.5 text-secondary-black absolute left-2 top-1/2 -translate-y-1/2' />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Search transcript'
            className='w-full text-xs pl-7 pr-6 py-1.5 rounded-md border border-[#EAECF0] focus:outline-none focus:border-primary'
          />
          {query && (
            <button
              type='button'
              onClick={() => setQuery("")}
              className='absolute right-1.5 top-1/2 -translate-y-1/2 text-secondary-black'
            >
              <X className='w-3 h-3' />
            </button>
          )}
        </div>
        {query && (
          <div className='flex items-center gap-1 shrink-0'>
            <span className='text-[11px] text-secondary-black tabular-nums'>
              {totalMatches ? `${activeMatch + 1}/${totalMatches}` : "0/0"}
            </span>
            <button type='button' onClick={() => goToMatch(-1)} className='p-1 rounded hover:bg-[#F5F6F7]'>
              <ChevronUp className='w-3.5 h-3.5' />
            </button>
            <button type='button' onClick={() => goToMatch(1)} className='p-1 rounded hover:bg-[#F5F6F7]'>
              <ChevronDown className='w-3.5 h-3.5' />
            </button>
          </div>
        )}
        <button
          type='button'
          onClick={() => downloadTxt(segments)}
          aria-label='Download transcript as text'
          className='p-1.5 rounded hover:bg-[#F5F6F7] shrink-0'
        >
          <Download className='w-3.5 h-3.5 text-secondary-black' />
        </button>
      </div>

      <div ref={containerRef} onScroll={handleScroll} className='flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3'>
        {segments.map((segment, i) => (
          <div key={segment.id} className='group'>
            <div className='flex items-baseline gap-2'>
              <span className={cn("text-xs font-semibold", SPEAKER_COLOR[segment.speaker])}>
                {SPEAKER_LABEL[segment.speaker]}
              </span>
              <span className='text-[10px] text-secondary-black opacity-0 group-hover:opacity-100 transition-opacity tabular-nums'>
                {formatTimestamp(segment.start_ms)}
              </span>
            </div>
            <p className='text-sm text-primaryBlack mt-0.5'>
              {highlightMatches(segment.text, query, activeMatch, matchOffsets[i] ?? 0)}
            </p>
          </div>
        ))}
      </div>

      {!autoScroll && (
        <button
          type='button'
          onClick={() => setAutoScroll(true)}
          className='mx-4 mb-3 btn btn-xs btn-primary text-white rounded-md self-center shrink-0'
        >
          Resume auto-scroll
        </button>
      )}
    </div>
  );
};

export default TranscriptTab;
