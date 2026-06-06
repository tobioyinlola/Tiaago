import Link from "next/link";

import { CompanySkillAssessment, ISearchParams } from "@/app/common/types";
import {
  cn,
  getAssessmentDifficultyLevel,
  getNoOfAssementQuestions,
  handleServerApiCallError,
  toId,
} from "@/app/common/utils";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import AssessmentSearch from "./_components/AssessmentSearch";
import ServerPagination from "@/app/common/components/ServerPagination";
import { getCompanyAssessments } from "@/app/common/services/assessment";

export const metadata = {
  title: "Assessments",
};

const AssessmentsPage = async ({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page as string) : 1;
  const search = resolvedSearchParams.q ? (resolvedSearchParams.q as string) : undefined;
  const res = await getCompanyAssessments(page, 9, search).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get assessments error (Assessments): ", error);
    errors.push({
      message: error,
      title: "Error getting assessments",
    });
    return null;
  });
  const assessments = res?.results ?? [];
  // console.dir(assessments, { depth: 4 });
  return (
    <>
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-semibold mb-1 font-switzer'>
          Assessments
        </h1>
        <h4 className='text-[#636568] text-base'>
          Discover your skill level and receive customized job postings
        </h4>
      </div>
      <AssessmentSearch
        defaultSearchText={search}
        searchParams={resolvedSearchParams}
      />
      <div className='grid md:grid-cols-3 gap-4'>
        {assessments.map((assessment, index) => (
          <AssessmentCard key={index} assessment={assessment} />
        ))}
      </div>
      {assessments.length === 0 && (
        <div className='flex flex-col items-center justify-center h-full'>
          <p className='text-lg text-center text-secondary-black'>
            No assessments found
          </p>
        </div>
      )}

      {/* <h1 className='text-lg font-medium mt-12'>Suggestions</h1>
      <h4 className='text-secondary-black text-sm mt-2 mb-6'>
        Take assessments outside your primary role to set you apart
      </h4>
      <div className='grid md:grid-cols-3 gap-4'>
        {suggestions.slice(0, 3).map((assessment, index) => (
          <AssessmentCard key={index} assessment={assessment} />
        ))}
      </div> */}
      {!!res && (
        <ServerPagination pagedResource={res} searchParams={resolvedSearchParams} />
      )}
      <DisplayErrorMessages errors={errors} />
    </>
  );
};

export default AssessmentsPage;

const AssessmentCard = ({
  assessment,
}: {
  assessment: CompanySkillAssessment;
}) => {
  // const required = assessment.assessment_type === "required";
  const difficultyLevel = getAssessmentDifficultyLevel(
    assessment.difficulty_level
  ).toLowerCase();
  return (
    <Link
      href={toId(`/talents/assessments/${assessment.id}`)}
      className='bg-white rounded-xl border border-[#BDC3C7] hover:border-primary p-4 md:p-6'
    >
      <div className='flex justify-between'>
        {/* <Image
          src={assessment.image}
          alt={assessment.title}
          width={70}
          height={70}
        /> */}

        {!!assessment.difficulty_level && (
          <div
            className={cn(
              "text-base px-1 rounded-[2px] bg-[#F5F6F7] text-[#4C5CE8] font-medium h-fit capitalize",
              difficultyLevel === "intermediate" && "text-[#219150]",
              difficultyLevel === "senior" && "text-[#7D5AE2]"
            )}
          >
            {difficultyLevel}
          </div>
        )}
      </div>
      <h6 className='text-primary-black text-lg md:text-2xl font-bold mt-6 mb-4'>
        {assessment.title}
      </h6>
      <p className='text-secondary-black text-sm md:text-base font-medium line-clamp-3'>
        {assessment.description}
      </p>
      <div className='flex items-center gap-1 text-sm text-[#9DA3A8] mt-4'>
        {/* <p>{required ? "Required" : "Optional"}</p> */}
        {/* <BsDot aria-hidden /> */}
        <p className='text-sm'>
          {getNoOfAssementQuestions(assessment)} questions
        </p>
      </div>
    </Link>
  );
};
