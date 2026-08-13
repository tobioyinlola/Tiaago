"use client";

import { Check, X } from "lucide-react";
import { m, Variants } from "framer-motion";

/** Before/after stage-transition timeline for "Never lose a candidate to
 * your own bandwidth" -- a stalled manual row (grey, dots stop moving)
 * against an automated row (green, every dot fires). Dots light up one
 * after another on scroll-in; the manual row visibly stops partway
 * through, the automated row runs all the way to the end. */
const STAGES = ["Applied", "Screened", "Assessment sent", "Interview booked"];

const rowVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18 } },
};

const dotVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 260, damping: 18 } },
};

const Row = ({ label, active, stalledAt }: { label: string; active: boolean; stalledAt?: number }) => (
  <div className='mb-6 last:mb-0'>
    <p className='text-xs font-jetbrains-mono uppercase tracking-widest text-[#667085] mb-3'>{label}</p>
    <m.div
      className='relative flex items-center justify-between'
      variants={rowVariants}
      initial='hidden'
      whileInView='visible'
      viewport={{ once: true, amount: 0.6 }}
    >
      <div className={`absolute left-0 right-0 h-0.5 ${active ? "bg-primary/40" : "bg-[#E4E7EC]"}`} aria-hidden />
      {STAGES.map((stage, i) => {
        const isStalled = !active && stalledAt !== undefined && i >= stalledAt;
        return (
          <m.div key={stage} variants={dotVariants} className='relative z-10 flex flex-col items-center gap-2'>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                isStalled ? "bg-white border-2 border-[#CBD2D9]" : "bg-primary"
              }`}
            >
              {isStalled ? (
                <X className='w-3.5 h-3.5 text-[#CBD2D9]' />
              ) : (
                <Check className='w-3.5 h-3.5 text-white' />
              )}
            </div>
            <span className={`text-[10px] font-onest text-center w-16 ${isStalled ? "text-[#98A2B3]" : "text-black"}`}>
              {stage}
            </span>
          </m.div>
        );
      })}
    </m.div>
  </div>
);

const StageTimeline = () => (
  <div className='max-w-md mx-auto'>
    <Row label='Manual follow-up' active={false} stalledAt={2} />
    <Row label='With Tiaago' active />
  </div>
);

export default StageTimeline;
