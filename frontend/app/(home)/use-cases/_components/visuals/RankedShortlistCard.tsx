"use client";

import { m, Variants } from "framer-motion";

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

/** One ranked-candidate-list card, reused twice: as two mismatched
 * "Recruiter A"/"Recruiter B" cards (inconsistency problem) and once more
 * as a single unified card (the payoff, "same criteria, every recruiter").
 * Candidates are initials-only, no photos -- matches the brief's note on
 * keeping this illustration literal but not decorative. Rows count in
 * top-to-bottom on scroll-in; the unified card lifts on hover to draw the
 * eye to the payoff state. */
const RankedShortlistCard = ({
  label,
  order,
  unified = false,
}: {
  label: string;
  order: { initials: string; score: number }[];
  unified?: boolean;
}) => (
  <m.div
    className={`rounded-2xl border bg-white p-5 w-full sm:w-64 transition-all duration-300 ${
      unified ? "border-2 border-brand-navy hover:-translate-y-1 hover:shadow-lg" : "border-[#E4E7EC] hover:shadow-sm"
    }`}
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.4 }}
    transition={{ duration: 0.4 }}
  >
    <p
      className={`text-xs font-jetbrains-mono uppercase tracking-widest mb-4 ${
        unified ? "text-primary" : "text-[#667085]"
      }`}
    >
      {label}
    </p>
    <m.div
      className='flex flex-col gap-2'
      variants={listVariants}
      initial='hidden'
      whileInView='visible'
      viewport={{ once: true, amount: 0.4 }}
    >
      {order.map((c, i) => (
        <m.div key={c.initials} variants={rowVariants} className='flex items-center gap-3'>
          <span className='text-xs font-onest text-[#98A2B3] w-4'>{i + 1}</span>
          <div className='w-7 h-7 rounded-full bg-brand-navy/10 flex items-center justify-center text-[10px] font-onest font-semibold text-black'>
            {c.initials}
          </div>
          <span
            className={`ml-auto text-xs font-onest font-medium rounded-full px-2 py-0.5 ${
              unified ? "bg-primary/10 text-primary" : "bg-[#F2F4F7] text-[#667085]"
            }`}
          >
            {c.score}%
          </span>
        </m.div>
      ))}
    </m.div>
  </m.div>
);

export default RankedShortlistCard;
