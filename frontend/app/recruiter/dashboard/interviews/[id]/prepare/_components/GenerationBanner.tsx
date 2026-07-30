import { Sparkles } from "lucide-react";

const GenerationBanner = () => (
  <div className='flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-2lg px-5 py-4'>
    <span className='w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0'>
      <Sparkles className='w-4 h-4 text-primary animate-pulse' />
    </span>
    <div className='min-w-0'>
      <p className='text-sm font-medium text-primaryBlack'>
        AI is preparing your brief...
      </p>
      <p className='text-xs text-secondary-black'>Usually takes 15 to 20 seconds</p>
    </div>
    <span className='loading loading-dots loading-sm text-primary ml-auto' />
  </div>
);

export default GenerationBanner;
