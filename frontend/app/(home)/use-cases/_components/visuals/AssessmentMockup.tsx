import { Sparkles } from "lucide-react";

const QUESTIONS = [
  "Walk through how you'd structure state management in a mid-size React app.",
  "Describe a time you had to debug a production issue under time pressure.",
  "What tradeoffs would you consider before introducing a new dependency?",
];

/** Generated-assessment mockup for the independent-recruiters page --
 * moderate width, supporting proof point rather than a hero visual. */
const AssessmentMockup = () => (
  <div className='max-w-md mx-auto rounded-2xl border border-[#E4E7EC] bg-white shadow-[0_20px_50px_-15px_rgba(26,60,94,0.2)] overflow-hidden'>
    <div className='bg-brand-navy px-6 py-4 flex items-center justify-between'>
      <p className='text-white text-sm font-onest font-semibold'>Senior Frontend Engineer: Assessment</p>
      <span className='flex items-center gap-1 text-[10px] font-onest bg-primary/20 text-primary rounded-full px-2 py-1 shrink-0 ml-3'>
        <Sparkles className='w-3 h-3' /> AI-generated
      </span>
    </div>
    <div className='divide-y divide-[#EAECF0]'>
      {QUESTIONS.map((q, i) => (
        <div key={q} className='px-6 py-4'>
          <p className='text-xs font-jetbrains-mono text-[#98A2B3] mb-1'>Q{i + 1}</p>
          <p className='text-sm font-onest text-black'>{q}</p>
        </div>
      ))}
    </div>
  </div>
);

export default AssessmentMockup;
