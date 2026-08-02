import { ArrowRight, Calendar, FileSearch, MessageSquare, Workflow, ClipboardCheck } from "lucide-react";

/** Before/after: 4-5 disconnected tool icons with broken dotted lines,
 * vs one navy pipeline bar with a single green flow line through it --
 * the most literal diagram on the in-house page, matching its
 * "consolidation" message. */
const DISCONNECTED_TOOLS = [
  { label: "Screening tool", icon: FileSearch },
  { label: "Assessment tool", icon: ClipboardCheck },
  { label: "Scheduler", icon: Calendar },
  { label: "Notes doc", icon: MessageSquare },
];

const StackConsolidation = () => (
  <div className='flex flex-col lg:flex-row items-center gap-8 lg:gap-4 max-w-4xl mx-auto'>
    <div className='flex flex-wrap justify-center gap-4 lg:gap-3'>
      {DISCONNECTED_TOOLS.map(({ label, icon: Icon }, i) => (
        <div key={label} className='relative flex flex-col items-center'>
          <div className='w-16 h-16 rounded-xl border border-dashed border-[#CBD2D9] bg-[#F8FAFC] flex items-center justify-center mb-2'>
            <Icon className='w-6 h-6 text-[#98A2B3]' />
          </div>
          <span className='text-[10px] font-onest text-[#667085] text-center w-16'>{label}</span>
          {i < DISCONNECTED_TOOLS.length - 1 && (
            <span className='hidden lg:block absolute top-8 left-full w-3 border-t border-dashed border-[#CBD2D9]' aria-hidden />
          )}
        </div>
      ))}
    </div>

    <ArrowRight className='hidden lg:block w-8 h-8 text-primary shrink-0' />
    <div className='lg:hidden w-px h-8 border-l border-dashed border-[#CBD2D9]' aria-hidden />

    <div className='flex flex-col items-center'>
      <div className='w-20 h-20 rounded-2xl bg-brand-navy flex items-center justify-center mb-2'>
        <Workflow className='w-8 h-8 text-primary' />
      </div>
      <span className='text-xs font-onest font-medium text-black'>One Tiaago pipeline</span>
    </div>
  </div>
);

export default StackConsolidation;
