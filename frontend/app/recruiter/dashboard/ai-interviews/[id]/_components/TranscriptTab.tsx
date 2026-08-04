"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";

import { cn } from "@/app/common/utils";
import { ID } from "@/app/common/types";
import { getRecruiterAIInterviewTranscript, type AIInterviewTranscriptSegment } from "@/app/common/services/ai-interviews";

const highlight = (text: string, query: string) => {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className='bg-amber-200 rounded px-0.5'>
        {part}
      </mark>
    ) : (
      part
    )
  );
};

const downloadTxt = (segments: AIInterviewTranscriptSegment[], candidateName: string) => {
  const content = segments
    .map(segment => `${segment.speaker === "ALEX" ? "Alex" : candidateName}: ${segment.text}`)
    .join("\n\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${candidateName.replace(/\s+/g, "-").toLowerCase() || "candidate"}-interview-transcript.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

const TranscriptTab = ({ interviewId, candidateName }: { interviewId: ID; candidateName: string }) => {
  const [segments, setSegments] = useState<AIInterviewTranscriptSegment[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    getRecruiterAIInterviewTranscript(interviewId).then(res => {
      if (res.success) setSegments(res.data.segments);
      else setError(res.error);
    });
  }, [interviewId]);

  const filtered = useMemo(() => {
    if (!segments) return [];
    if (!query.trim()) return segments;
    return segments.filter(segment => segment.text.toLowerCase().includes(query.toLowerCase()));
  }, [segments, query]);

  if (error) return <p className='text-sm text-destructive'>{error}</p>;
  if (!segments) return <span className='loading loading-spinner loading-md text-primary' />;

  return (
    <div className='max-w-3xl'>
      <div className='flex items-center gap-3 mb-5'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-black' />
          <input
            type='text'
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder='Search transcript...'
            className='input input-bordered w-full pl-9 text-sm'
          />
        </div>
        <button
          type='button'
          onClick={() => downloadTxt(segments, candidateName)}
          className='btn btn-sm btn-outline gap-1.5'
        >
          <Download className='w-3.5 h-3.5' />
          Download TXT
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className='text-sm text-secondary-black'>No transcript available yet.</p>
      ) : (
        <div className='flex flex-col gap-4'>
          {filtered.map((segment, index) => (
            <div key={index} className={cn("flex flex-col", segment.speaker === "CANDIDATE" && "items-end")}>
              <span className='text-xs text-secondary-black mb-1'>
                {segment.speaker === "ALEX" ? "Alex" : candidateName} &middot; {Math.round(segment.timestamp_ms / 1000)}s
              </span>
              <p
                className={cn(
                  "max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-6",
                  segment.speaker === "ALEX" ? "bg-[#F5F6F7] text-primaryBlack" : "bg-primary/10 text-primaryBlack"
                )}
              >
                {highlight(segment.text, query)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TranscriptTab;
