"use client";

import { m } from "framer-motion";

/** Horizontal stacked-bar time-allocation visual for "Time Reclaimed" --
 * before: mostly screening (muted grey), after: mostly candidate/client
 * conversations (primary), both against a brand-navy "everything
 * else" remainder. Bars grow into place from 0 width on scroll-in, so the
 * "before" bar visibly reads as heavier than "after". */
const Row = ({ label, screeningPct }: { label: string; screeningPct: number }) => (
  <div className='mb-6 last:mb-0'>
    <p className='text-xs font-jetbrains-mono uppercase tracking-widest text-[#667085] mb-2'>{label}</p>
    <div className='w-full h-10 rounded-lg overflow-hidden flex border border-[#E4E7EC]'>
      <m.div
        className={screeningPct >= 40 ? "bg-[#CBD2D9]" : "bg-primary"}
        initial={{ width: 0 }}
        whileInView={{ width: `${screeningPct}%` }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        title='Screening'
      />
      <m.div
        className={screeningPct >= 40 ? "bg-brand-navy" : "bg-brand-navy/80"}
        initial={{ width: 0 }}
        whileInView={{ width: `${100 - screeningPct}%` }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
        title='Candidate & client conversations'
      />
    </div>
  </div>
);

const BeforeAfterBar = () => (
  <div className='max-w-md'>
    <Row label='Before Tiaago' screeningPct={40} />
    <Row label='After Tiaago' screeningPct={5} />
    <div className='flex items-center gap-4 mt-4 text-xs font-onest text-[#667085]'>
      <span className='flex items-center gap-1.5'>
        <span className='w-2.5 h-2.5 rounded-sm bg-[#CBD2D9] inline-block' /> Screening
      </span>
      <span className='flex items-center gap-1.5'>
        <span className='w-2.5 h-2.5 rounded-sm bg-brand-navy inline-block' /> Candidate &amp; client work
      </span>
    </div>
  </div>
);

export default BeforeAfterBar;
