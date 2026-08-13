"use client";

import { Sparkles } from "lucide-react";
import { m, Variants } from "framer-motion";

const QUESTIONS = [
  "Walk through how you'd structure state management in a mid-size React app.",
  "Describe a time you had to debug a production issue under time pressure.",
  "What tradeoffs would you consider before introducing a new dependency?",
];

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};

const questionVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

/** Generated-assessment mockup for the independent-recruiters page --
 * moderate width, supporting proof point rather than a hero visual.
 * Questions type in one after another, as if the AI is generating them
 * live -- the "AI-generated" badge gets a subtle pulse to match. */
const AssessmentMockup = () => (
  <m.div
    className='max-w-md mx-auto rounded-2xl border border-[#E4E7EC] bg-white shadow-[0_20px_50px_-15px_rgba(26,60,94,0.2)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_-15px_rgba(26,60,94,0.28)]'
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.5 }}
  >
    <div className='bg-brand-navy px-6 py-4 flex items-center justify-between'>
      <p className='text-white text-sm font-onest font-semibold'>Senior Frontend Engineer: Assessment</p>
      <span className='flex items-center gap-1 text-[10px] font-onest bg-primary/20 text-primary rounded-full px-2 py-1 shrink-0 ml-3'>
        <Sparkles className='w-3 h-3 animate-pulse' /> AI-generated
      </span>
    </div>
    <m.div
      className='divide-y divide-[#EAECF0]'
      variants={listVariants}
      initial='hidden'
      whileInView='visible'
      viewport={{ once: true, amount: 0.3 }}
    >
      {QUESTIONS.map((q, i) => (
        <m.div key={q} variants={questionVariants} className='px-6 py-4'>
          <p className='text-xs font-jetbrains-mono text-[#98A2B3] mb-1'>Q{i + 1}</p>
          <p className='text-sm font-onest text-black'>{q}</p>
        </m.div>
      ))}
    </m.div>
  </m.div>
);

export default AssessmentMockup;
