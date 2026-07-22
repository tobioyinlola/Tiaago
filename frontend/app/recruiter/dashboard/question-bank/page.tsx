import Link from "next/link";

import { getTalentRoles } from "@/app/common/services";
import { listAssessmentBundles } from "@/app/common/services/assessment";
import { handleServerApiCallError } from "@/app/common/utils";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";
import { ISearchParams } from "@/app/common/types";

export const metadata = {
  title: "Question Bank",
};

type Props = {
  searchParams: Promise<ISearchParams>;
};

const QuestionBank = async ({ searchParams }: Props) => {
  const resolvedSearchParams = await searchParams;
  const roleFilter =
    typeof resolvedSearchParams.role === "string" ? resolvedSearchParams.role : undefined;

  const errors: DisplayErrorMessagesProps["errors"] = [];
  const talentRoles = await getTalentRoles().catch(async e => {
    const error = await handleServerApiCallError(e);
    errors.push({ message: error, title: "Error getting roles" });
    return [];
  });
  const { results: bundles } = await listAssessmentBundles(
    roleFilter ? { role: roleFilter } : undefined
  ).catch(async e => {
    const error = await handleServerApiCallError(e);
    errors.push({ message: error, title: "Error getting question bank" });
    return { results: [] };
  });

  return (
    <div className='flex-1 flex flex-col'>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8 flex items-end justify-between flex-wrap gap-4'>
        <div>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Question Bank</h1>
          <h4 className='text-gray-900 text-base'>
            Explore our collection of expertly curated question bundles for building
            assessments.
          </h4>
        </div>
        <form className='flex items-center gap-2 pb-2'>
          <select
            name='role'
            defaultValue={roleFilter || ""}
            className='select select-bordered select-sm'
          >
            <option value=''>All roles</option>
            {talentRoles.map(role => (
              <option key={role.id} value={role.id}>
                {role.title}
              </option>
            ))}
          </select>
          <button type='submit' className='btn btn-sm btn-primary text-white'>
            Filter
          </button>
        </form>
      </div>

      {bundles.length === 0 ? (
        <div className='flex-1 flex justify-center items-center'>
          <EmptyStateV3
            text='No bundles found'
            subText='Try a different role filter, or check back soon for more content.'
            imgHeight={180}
            imgWidth={180}
            imgSrc='/assets/icons/event-empty-state.svg'
          />
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {bundles.map(bundle => (
            <div
              key={bundle.id}
              className='border border-[#EAECF0] rounded-lg p-5 bg-white flex flex-col'
            >
              <div className='flex items-center gap-2 mb-1'>
                <p className='font-semibold text-primaryBlack'>{bundle.name}</p>
                {bundle.is_recommended && (
                  <span className='text-xs font-medium px-2 py-[2px] bg-[#F1F3FF] text-primary rounded-full'>
                    Recommended
                  </span>
                )}
              </div>
              <p className='text-sm text-[#9DA3A8] mb-3 flex-1'>{bundle.description}</p>
              <div className='flex items-center gap-4 text-xs text-[#6C757D]'>
                <span>{bundle.role.title}</span>
                <span>{bundle.difficulty_level}</span>
                <span>{bundle.estimated_duration_minutes}m</span>
                <span>{bundle.question_count} questions</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className='mt-10 text-center'>
        <p className='text-sm text-[#6C757D] mb-2'>
          Ready to build an assessment with these bundles?
        </p>
        <Link href='/recruiter/dashboard/assessments/add' className='btn btn-primary text-white'>
          Start the Assessment Wizard
        </Link>
      </div>
    </div>
  );
};

export default QuestionBank;
