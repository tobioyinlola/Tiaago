import { Lightbulb, Target, Flag } from "lucide-react";

const ICONS = [Lightbulb, Target, Flag];

const CandidateSnapshot = ({ points }: { points: string[] }) => {
  if (!points?.length) return null;

  return (
    <div>
      <p className='text-sm font-semibold text-primaryBlack mb-3'>Key things to know</p>
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        {points.map((point, index) => {
          const Icon = ICONS[index % ICONS.length];
          return (
            <div
              key={index}
              className='bg-white border border-[#EAECF0] rounded-2lg p-5 shadow-sm flex flex-col gap-3'
            >
              <span className='w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center'>
                <Icon className='w-4 h-4' />
              </span>
              <p className='text-sm text-primaryBlack leading-relaxed'>{point}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CandidateSnapshot;
