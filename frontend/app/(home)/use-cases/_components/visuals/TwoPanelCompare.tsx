"use client";

import { ReactNode } from "react";
import { m } from "framer-motion";

/** Generic two-card side-by-side comparison -- used for "flat fee vs
 * usage-based cost" (agency page) and "agency team vs you" (independent
 * page). Left panel is always the "old way" (grey/muted), right is always
 * Tiaago (navy border, green accent line, and the only one that lifts on
 * hover -- a small nudge toward which side is meant to win). */
const TwoPanelCompare = ({
  leftLabel,
  leftContent,
  rightLabel,
  rightContent,
}: {
  leftLabel: string;
  leftContent: ReactNode;
  rightLabel: string;
  rightContent: ReactNode;
}) => (
  <div className='grid md:grid-cols-2 gap-6 max-w-3xl mx-auto'>
    <m.div
      className='rounded-2xl border border-[#E4E7EC] bg-[#F8FAFC] p-6 md:p-8'
      initial={{ opacity: 0, x: -16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
    >
      <p className='text-xs font-jetbrains-mono uppercase tracking-widest text-[#667085] mb-4'>
        {leftLabel}
      </p>
      {leftContent}
    </m.div>
    <m.div
      className='rounded-2xl border-2 border-brand-navy bg-white p-6 md:p-8 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl'
      initial={{ opacity: 0, x: 16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className='absolute top-0 left-0 right-0 h-1 bg-primary' aria-hidden />
      <p className='text-xs font-jetbrains-mono uppercase tracking-widest text-primary mb-4'>
        {rightLabel}
      </p>
      {rightContent}
    </m.div>
  </div>
);

export default TwoPanelCompare;
