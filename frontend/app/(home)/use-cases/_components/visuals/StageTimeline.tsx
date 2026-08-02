import { Check, X } from "lucide-react";

/** Before/after stage-transition timeline for "Never lose a candidate to
 * your own bandwidth" -- a stalled manual row (grey, dots stop moving)
 * against an automated row (green, every dot fires). */
const STAGES = ["Applied", "Screened", "Assessment sent", "Interview booked"];

const Row = ({ label, active, stalledAt }: { label: string; active: boolean; stalledAt?: number }) => (
  <div className='mb-6 last:mb-0'>
    <p className='text-xs font-jetbrains-mono uppercase tracking-widest text-[#667085] mb-3'>{label}</p>
    <div className='relative flex items-center justify-between'>
      <div className={`absolute left-0 right-0 h-0.5 ${active ? "bg-primary/40" : "bg-[#E4E7EC]"}`} aria-hidden />
      {STAGES.map((stage, i) => {
        const isStalled = !active && stalledAt !== undefined && i >= stalledAt;
        return (
          <div key={stage} className='relative z-10 flex flex-col items-center gap-2'>
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
          </div>
        );
      })}
    </div>
  </div>
);

const StageTimeline = () => (
  <div className='max-w-md mx-auto'>
    <Row label='Manual follow-up' active={false} stalledAt={2} />
    <Row label='With Tiaago' active />
  </div>
);

export default StageTimeline;
