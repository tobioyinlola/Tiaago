import { cn } from "@/app/common/utils";

const toneFor = (score: number | null, max: number) => {
  if (score === null) return "text-secondary-black bg-[#F5F6F7]";
  const pct = (score / max) * 100;
  if (pct >= 80) return "text-success bg-badge-green-bg";
  if (pct >= 60) return "text-badge-blue-text bg-badge-blue-bg";
  if (pct >= 40) return "text-amber-700 bg-amber-50";
  return "text-destructive bg-destructive/10";
};

const ScoreTile = ({ label, score, max }: { label: string; score: number | null; max: number }) => (
  <div className='bg-white p-5 rounded-2lg shadow-soft border border-[#EAECF0] flex flex-col gap-2'>
    <p className='text-secondary-black text-sm'>{label}</p>
    <p className={cn("inline-flex items-baseline gap-1 w-fit px-2.5 py-1 rounded-lg text-xl font-bold font-space-grotesk", toneFor(score, max))}>
      {score !== null ? Math.round(score) : "--"}
      <span className='text-xs font-normal'>/{max}</span>
    </p>
  </div>
);

export default ScoreTile;
