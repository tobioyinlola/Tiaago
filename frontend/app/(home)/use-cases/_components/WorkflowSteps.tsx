"use client";

import { m, Variants } from "framer-motion";
import { Briefcase, FileSearch, ClipboardCheck, Calendar, Sparkles, UserPlus } from "lucide-react";

/** The 6-step pipeline diagram, identical across all 3 use-case pages by
 * design -- reinforces "this is one product" regardless of which audience
 * page a visitor lands on (see brief's component-reuse notes). Horizontal
 * with a connecting line on desktop, vertical stack with the line rotated
 * on mobile. Steps stagger in and the line draws itself on scroll-into-view;
 * each step lifts and lights up on hover so the diagram reads as an active
 * pipeline rather than a static graphic. */
const STEPS = [
  { label: "Job created", icon: Briefcase },
  { label: "Candidate applies", icon: UserPlus },
  { label: "AI screens resume", icon: FileSearch },
  { label: "Assessment auto-sent", icon: ClipboardCheck },
  { label: "Interview booked", icon: Calendar },
  { label: "AI copilot + summary", icon: Sparkles },
];

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const stepVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 16 } },
};

const lineVariantsX: Variants = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.9, ease: "easeInOut" } },
};

const lineVariantsY: Variants = {
  hidden: { scaleY: 0 },
  visible: { scaleY: 1, transition: { duration: 0.9, ease: "easeInOut" } },
};

const StepCircle = ({ icon: Icon, className = "" }: { icon: typeof Briefcase; className?: string }) => (
  <div
    className={`relative z-10 w-14 h-14 rounded-full bg-white border-2 border-brand-navy flex items-center justify-center transition-all duration-300 group-hover:border-primary group-hover:shadow-[0_0_0_6px_rgba(84,101,255,0.1)] group-hover:scale-110 ${className}`}
  >
    <Icon className='w-5 h-5 text-black transition-colors duration-300 group-hover:text-primary' />
  </div>
);

const WorkflowSteps = () => (
  <m.div
    className='relative'
    variants={containerVariants}
    initial='hidden'
    whileInView='visible'
    viewport={{ once: true, amount: 0.3 }}
  >
    {/* Desktop: horizontal row with a connecting line through the icon row */}
    <div className='hidden md:grid grid-cols-6 gap-2 relative'>
      <m.div
        variants={lineVariantsX}
        style={{ transformOrigin: "left" }}
        className='absolute top-7 left-[8%] right-[8%] h-0.5 bg-primary/40'
        aria-hidden
      />
      {STEPS.map(({ label, icon: Icon }, i) => (
        <m.div key={label} variants={stepVariants} className='group relative flex flex-col items-center text-center px-2 cursor-default'>
          <StepCircle icon={Icon} className='mb-3' />
          <p className='text-xs font-onest font-medium text-black leading-snug transition-colors duration-300 group-hover:text-primary'>
            {i + 1}. {label}
          </p>
        </m.div>
      ))}
    </div>

    {/* Mobile: vertical stack, connecting line rotated to run down the left edge */}
    <div className='md:hidden flex flex-col gap-6 relative pl-3'>
      <m.div
        variants={lineVariantsY}
        style={{ transformOrigin: "top" }}
        className='absolute top-7 bottom-7 left-[26px] w-0.5 bg-primary/40'
        aria-hidden
      />
      {STEPS.map(({ label, icon: Icon }, i) => (
        <m.div key={label} variants={stepVariants} className='group relative z-10 flex items-center gap-4'>
          <div className='shrink-0'>
            <StepCircle icon={Icon} />
          </div>
          <p className='text-sm font-onest font-medium text-black transition-colors duration-300 group-hover:text-primary'>
            {i + 1}. {label}
          </p>
        </m.div>
      ))}
    </div>
  </m.div>
);

export default WorkflowSteps;
