import { ReactNode } from "react";

/** Generic two-card side-by-side comparison -- used for "flat fee vs
 * usage-based cost" (agency page) and "agency team vs you" (independent
 * page). Left panel is always the "old way" (grey/muted), right is always
 * Tiaago (navy border, green accent line). */
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
    <div className='rounded-2xl border border-[#E4E7EC] bg-[#F8FAFC] p-6 md:p-8'>
      <p className='text-xs font-jetbrains-mono uppercase tracking-widest text-[#667085] mb-4'>
        {leftLabel}
      </p>
      {leftContent}
    </div>
    <div className='rounded-2xl border-2 border-brand-navy bg-white p-6 md:p-8 relative overflow-hidden'>
      <div className='absolute top-0 left-0 right-0 h-1 bg-primary' aria-hidden />
      <p className='text-xs font-jetbrains-mono uppercase tracking-widest text-primary mb-4'>
        {rightLabel}
      </p>
      {rightContent}
    </div>
  </div>
);

export default TwoPanelCompare;
