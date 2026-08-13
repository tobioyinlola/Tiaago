"use client";

import { ArrowRight, Calendar, FileSearch, MessageSquare, Workflow, ClipboardCheck } from "lucide-react";
import { m, Variants } from "framer-motion";

/** Before/after: 4-5 disconnected tool icons with broken dotted lines,
 * vs one navy pipeline bar with a single green flow line through it --
 * the most literal diagram on the in-house page, matching its
 * "consolidation" message. The scattered tools fall into place first,
 * then the arrow, then the unified pipeline settles in with a small
 * overshoot -- reads as "many things collapsing into one". */
const DISCONNECTED_TOOLS = [
  { label: "Screening tool", icon: FileSearch },
  { label: "Assessment tool", icon: ClipboardCheck },
  { label: "Scheduler", icon: Calendar },
  { label: "Notes doc", icon: MessageSquare },
];

const toolsVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const toolVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35 } },
};

const StackConsolidation = () => (
  <div className='flex flex-col lg:flex-row items-center gap-8 lg:gap-4 max-w-4xl mx-auto'>
    <m.div
      className='flex flex-wrap justify-center gap-4 lg:gap-3'
      variants={toolsVariants}
      initial='hidden'
      whileInView='visible'
      viewport={{ once: true, amount: 0.4 }}
    >
      {DISCONNECTED_TOOLS.map(({ label, icon: Icon }, i) => (
        <m.div key={label} variants={toolVariants} className='relative flex flex-col items-center'>
          <div className='w-16 h-16 rounded-xl border border-dashed border-[#CBD2D9] bg-[#F8FAFC] flex items-center justify-center mb-2'>
            <Icon className='w-6 h-6 text-[#98A2B3]' />
          </div>
          <span className='text-[10px] font-onest text-[#667085] text-center w-16'>{label}</span>
          {i < DISCONNECTED_TOOLS.length - 1 && (
            <span className='hidden lg:block absolute top-8 left-full w-3 border-t border-dashed border-[#CBD2D9]' aria-hidden />
          )}
        </m.div>
      ))}
    </m.div>

    <ArrowRight className='hidden lg:block w-8 h-8 text-primary shrink-0' />
    <div className='lg:hidden w-px h-8 border-l border-dashed border-[#CBD2D9]' aria-hidden />

    <m.div
      className='flex flex-col items-center'
      initial={{ opacity: 0, scale: 0.7 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.5 }}
    >
      <div className='w-20 h-20 rounded-2xl bg-brand-navy flex items-center justify-center mb-2 transition-shadow duration-300 hover:shadow-[0_0_0_8px_rgba(84,101,255,0.12)]'>
        <Workflow className='w-8 h-8 text-primary' />
      </div>
      <span className='text-xs font-onest font-medium text-black'>One Tiaago pipeline</span>
    </m.div>
  </div>
);

export default StackConsolidation;
