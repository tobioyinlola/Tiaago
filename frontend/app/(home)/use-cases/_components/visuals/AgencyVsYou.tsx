"use client";

import { Check, User, Users } from "lucide-react";
import { m } from "framer-motion";

/** Side-by-side "3-recruiter agency" vs "you" converging on the same
 * shortlist output -- the literal illustration of "why you lose mandates"
 * on the independent-recruiters page. Both cards float in from opposite
 * sides and meet at the "=" so the equivalence reads as something that
 * happens, not just a static diagram. */
const AgencyVsYou = () => (
  <m.div
    className='max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-4'
    initial='hidden'
    whileInView='visible'
    viewport={{ once: true, amount: 0.4 }}
  >
    <m.div
      variants={{ hidden: { opacity: 0, x: -24 }, visible: { opacity: 1, x: 0, transition: { duration: 0.5 } } }}
      className='flex flex-col items-center gap-3 rounded-2xl border border-[#E4E7EC] bg-[#F8FAFC] px-8 py-6 w-full sm:w-auto transition-shadow duration-300 hover:shadow-md'
    >
      <div className='flex -space-x-2'>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className='w-10 h-10 rounded-full bg-[#CBD2D9] border-2 border-white flex items-center justify-center'
          >
            <User className='w-4 h-4 text-white' />
          </div>
        ))}
      </div>
      <p className='text-sm font-onest text-[#667085]'>Agency (3 recruiters)</p>
    </m.div>

    <m.span
      variants={{ hidden: { opacity: 0, scale: 0.6 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.4, delay: 0.3 } } }}
      className='text-2xl font-onest text-[#98A2B3] shrink-0'
    >
      =
    </m.span>

    <m.div
      variants={{ hidden: { opacity: 0, x: 24 }, visible: { opacity: 1, x: 0, transition: { duration: 0.5 } } }}
      className='flex flex-col items-center gap-3 rounded-2xl border-2 border-brand-navy bg-white px-8 py-6 w-full sm:w-auto transition-all duration-300 hover:shadow-lg hover:-translate-y-1'
    >
      <div className='w-10 h-10 rounded-full bg-primary flex items-center justify-center'>
        <Users className='w-4 h-4 text-white' />
      </div>
      <p className='text-sm font-onest text-black font-medium'>You + Tiaago</p>
    </m.div>

    <m.div
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.4, delay: 0.5 } } }}
      className='flex items-center gap-2 shrink-0 mt-2 sm:mt-0 sm:ml-2'
    >
      <Check className='w-4 h-4 text-primary' />
      <span className='text-xs font-onest text-[#667085]'>Same shortlist, same day</span>
    </m.div>
  </m.div>
);

export default AgencyVsYou;
