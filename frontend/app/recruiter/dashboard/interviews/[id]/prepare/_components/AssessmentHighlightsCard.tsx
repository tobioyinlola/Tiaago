import { AssessmentHighlights } from "@/app/common/types";

const AssessmentHighlightsCard = ({
  highlights,
}: {
  highlights?: AssessmentHighlights;
}) => {
  if (!highlights) return null;
  const hasConcerns = !!highlights.concerns?.length;

  return (
    <div className='bg-white border border-[#EAECF0] rounded-2lg p-5'>
      <p className='text-sm font-semibold text-primaryBlack mb-4'>Assessment performance</p>
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${
          hasConcerns ? "lg:grid-cols-4" : "lg:grid-cols-3"
        } gap-4`}
      >
        <div className='bg-[#F8FAFC] rounded-xl p-4'>
          <p className='text-[11px] font-medium text-secondary-black uppercase tracking-wide mb-1'>
            Overall score
          </p>
          <p className='text-3xl font-bold text-primaryBlack'>
            {highlights.overall_score ?? "--"}
            {highlights.overall_score !== null && (
              <span className='text-sm font-medium text-secondary-black'>/100</span>
            )}
          </p>
        </div>
        <div className='bg-success/5 rounded-xl p-4'>
          <p className='text-[11px] font-medium text-success uppercase tracking-wide mb-2'>
            Strong areas
          </p>
          <ul className='text-sm text-primaryBlack space-y-1'>
            {highlights.strong_areas?.length ? (
              highlights.strong_areas.map((a, i) => <li key={i}>{a}</li>)
            ) : (
              <li className='text-secondary-black'>None noted</li>
            )}
          </ul>
        </div>
        <div className='bg-amber-50 rounded-xl p-4'>
          <p className='text-[11px] font-medium text-amber-700 uppercase tracking-wide mb-2'>
            Weak areas
          </p>
          <ul className='text-sm text-primaryBlack space-y-1'>
            {highlights.weak_areas?.length ? (
              highlights.weak_areas.map((a, i) => <li key={i}>{a}</li>)
            ) : (
              <li className='text-secondary-black'>None noted</li>
            )}
          </ul>
        </div>
        {hasConcerns && (
          <div className='bg-destructive/5 rounded-xl p-4'>
            <p className='text-[11px] font-medium text-destructive uppercase tracking-wide mb-2'>
              Concerns
            </p>
            <ul className='text-sm text-primaryBlack space-y-1'>
              {highlights.concerns.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentHighlightsCard;
