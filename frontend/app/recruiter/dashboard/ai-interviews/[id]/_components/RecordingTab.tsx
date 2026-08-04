import { Download, Mic } from "lucide-react";

import type { AIInterviewDetail } from "@/app/common/services/ai-interviews";

const STATUS_COPY: Record<AIInterviewDetail["audio_recording_status"], string> = {
  NONE: "This interview wasn't recorded.",
  UPLOADING: "The recording is still being processed -- check back shortly.",
  READY: "",
  FAILED: "The recording failed to save for this interview.",
};

const RecordingTab = ({ interview }: { interview: AIInterviewDetail }) => {
  if (interview.audio_recording_status !== "READY" || !interview.audio_recording_url) {
    return (
      <div className='max-w-md flex flex-col items-center text-center py-16'>
        <div className='w-12 h-12 rounded-full bg-[#F5F6F7] flex items-center justify-center mb-4'>
          <Mic className='w-5 h-5 text-secondary-black' />
        </div>
        <p className='text-sm text-secondary-black'>{STATUS_COPY[interview.audio_recording_status]}</p>
      </div>
    );
  }

  return (
    <div className='max-w-2xl flex flex-col gap-4'>
      <audio controls src={interview.audio_recording_url} className='w-full' />
      <a href={interview.audio_recording_url} download className='btn btn-sm btn-outline gap-1.5 w-fit'>
        <Download className='w-3.5 h-3.5' />
        Download recording
      </a>
      <p className='text-xs text-secondary-black'>Recordings are retained per your organisation&apos;s data retention policy.</p>
    </div>
  );
};

export default RecordingTab;
