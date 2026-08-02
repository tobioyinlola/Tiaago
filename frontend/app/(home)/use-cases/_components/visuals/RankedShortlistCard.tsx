/** One ranked-candidate-list card, reused twice: as two mismatched
 * "Recruiter A"/"Recruiter B" cards (inconsistency problem) and once more
 * as a single unified card (the payoff, "same criteria, every recruiter").
 * Candidates are initials-only, no photos -- matches the brief's note on
 * keeping this illustration literal but not decorative. */
const RankedShortlistCard = ({
  label,
  order,
  unified = false,
}: {
  label: string;
  order: { initials: string; score: number }[];
  unified?: boolean;
}) => (
  <div
    className={`rounded-2xl border bg-white p-5 w-full sm:w-64 ${
      unified ? "border-2 border-brand-navy" : "border-[#E4E7EC]"
    }`}
  >
    <p
      className={`text-xs font-jetbrains-mono uppercase tracking-widest mb-4 ${
        unified ? "text-primary" : "text-[#667085]"
      }`}
    >
      {label}
    </p>
    <div className='flex flex-col gap-2'>
      {order.map((c, i) => (
        <div key={c.initials} className='flex items-center gap-3'>
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
        </div>
      ))}
    </div>
  </div>
);

export default RankedShortlistCard;
