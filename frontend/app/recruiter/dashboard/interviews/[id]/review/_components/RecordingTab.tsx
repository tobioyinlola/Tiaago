"use client";

import { Clock, FileWarning, Loader2, VideoOff } from "lucide-react";

import { InterviewReview } from "@/app/common/types";

const RecordingTab = ({ review }: { review: InterviewReview }) => {
  if (!review.recording_enabled) {
    return (
      <div className='max-w-2xl flex flex-col items-center text-center gap-2 py-16'>
        <VideoOff className='w-8 h-8 text-secondary-black/40' />
        <p className='text-sm text-primaryBlack'>Recording wasn&apos;t enabled for this interview.</p>
      </div>
    );
  }

  if (review.recording_status === "UPLOADING") {
    return (
      <div className='max-w-2xl flex flex-col items-center text-center gap-2 py-16'>
        <Loader2 className='w-8 h-8 text-primary animate-spin' />
        <p className='text-sm text-primaryBlack'>Recording is still processing.</p>
        <p className='text-xs text-secondary-black'>This can take a few minutes after the interview ends.</p>
      </div>
    );
  }

  if (review.recording_status === "FAILED" || !review.recording_url) {
    return (
      <div className='max-w-2xl flex flex-col items-center text-center gap-2 py-16'>
        <FileWarning className='w-8 h-8 text-amber-500' />
        <p className='text-sm text-primaryBlack'>The recording couldn&apos;t be processed.</p>
      </div>
    );
  }

  return (
    <div className='max-w-2xl flex flex-col gap-3'>
      <video controls className='w-full rounded-2lg bg-black' src={review.recording_url} />
      <div className='flex items-center gap-1.5 text-xs text-secondary-black'>
        <Clock className='w-3.5 h-3.5' />
        Recordings are available for 90 days after the interview.
      </div>
    </div>
  );
};

export default RecordingTab;
