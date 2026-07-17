import { notFound } from "next/navigation";
import { LuPencilLine } from "react-icons/lu";
import { HiOutlineTrash } from "react-icons/hi";

import {
  getNoOfAssementQuestions,
  getAssessmentDurationInMinutes,
  handleServerApiCallError,
} from "@/app/common/utils";
import NoQuestionsIcon from "@/app/common/icons/NoQuestionsIcon";
import { getCompanyAssessment } from "@/app/common/services/assessment";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

type Props = {
  params: Promise<{ id: string }>;
};

export const generateMetadata = async ({ params }: Props) => {
  const { id } = await params;
  const assessment = await getCompanyAssessment(id);

  return {
    title: assessment.title,
  };
};

const AssessmentDetailsPage = async ({ params }: Props) => {
  const { id } = await params;
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const assessment = await getCompanyAssessment(id).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log(
      "Get company assessment error (assessment details page): ",
      error
    );
    errors.push({
      message: error,
      title: "Error getting company assessment",
    });
    return null;
  });
  if (!assessment) return notFound();

  const noOfQuestions = getNoOfAssementQuestions(assessment);

  // const questionsFromQuestionBank = await getQuestionsFromQuestionBank(
  //   assessment.skillsets.map(skillset => skillset.id)
  // );

  const stats = [
    { title: "Questions", value: noOfQuestions },
    {
      title: "Duration",
      value: `${getAssessmentDurationInMinutes(assessment)}mins`,
    },
    { title: "Passing Grade", value: `${assessment.passing_grade}%` },
    { title: "Attempts", value: 0 },
  ];

  return (
    <div className='text-black max-w-7xl'>
      <DisplayErrorMessages errors={errors} />
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-medium font-space-grotesk text-primaryBlack'>
          Assessment Details
        </h1>

        <button className='btn btn-primary btn-sm h-10 px-4 font-medium font-inter'>
          Pubish Assessment
        </button>
      </div>

      <div className='bg-white rounded-xl p-6'>
        <div className='flex justify-between items-center pb-6 border-b-2 border-[#EAECF0]'>
          <div>
            <h2 className='text-lg md:text-2xl font-medium text-primaryBlack mb-3'>
              {assessment.title}
            </h2>
            <div className='flex gap-2 items-center'>
              <span className='text-primary bg-[#F5F6F7] px-1 rounded-sm text-base font-medium capitalize'>
                {assessment.difficulty_level.toLowerCase()}
              </span>
              <span className='text-primary bg-[#F5F6F7] px-1 rounded-sm text-base font-medium capitalize'>
                {assessment.assessment_type === "MCQ"
                  ? "MCQs"
                  : assessment.assessment_type
                      .replaceAll("_", " ")
                      .toLowerCase()}
              </span>
            </div>
          </div>
          <div className='flex gap-3 md:gap-8 items-center'>
            <button className='p-2 hover:bg-gray-100 rounded-full'>
              <LuPencilLine className='text-primary text-base shrink-0' />
            </button>
            <button className='p-2 hover:bg-gray-100 rounded-full'>
              <HiOutlineTrash className='text-[#FF4A4A] text-base shrink-0' />
            </button>
          </div>
        </div>

        <div className='grid grid-cols-2 md:grid-cols-4 gap-6 xl:gap-11 mt-11 w-fit mx-auto'>
          {stats.map((stat, index) => (
            <div
              className='card card-bordered border-[#BEC3C9] min-w-[150px] xl:min-w-[200px]'
              key={index}
            >
              <div className='card-body text-center p-6'>
                <h3 className='text-[#6C757D] text-sm mb-2'>{stat.title}</h3>
                <p className='text-base font-medium text-primaryBlack'>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='mt-10'>
        <div className='flex justify-between items-center mb-4'>
          <div className='px-1 py-1 bg-white rounded-lg text-sm text-[#2E3031]'>
            <button className='btn btn-primary btn-outline btn-xs rounded !text-primaryBlack border-primary hover:!text-white px-2 text-sm font-medium h-7'>
              Multiple choice Questions
            </button>
          </div>
          <button className='text-xs text-[#6C757D] hover:text-gray-800'>
            + Add Section
          </button>
        </div>

        <div className='bg-white rounded-2xl px-8 pb-10 pt-2 border border-[#EAECF0] flex flex-col items-center'>
          <NoQuestionsIcon />
          <p className='mt-2 mb-1 text-base font-bold text-center text-primaryBlack'>
            No questions added yet
          </p>
          <p className='text-[#6C757D] text-sm text-center'>
            Choose how you want to add one or more questions below
          </p>
          <div className='flex gap-4 mt-6'>
            <button className='btn btn-sm h-11 px-7 btn-primary btn-outline !text-primaryBlack border-primary hover:!text-white text-base font-medium rounded-lg'>
              Question Bank
            </button>
            <button className='btn btn-sm px-7 h-11 bg-[#FFF0F0] border border-[#FEE5E5] hover:border-[#FEE5E5] text-[#B53535] hover:bg-[#FEE5E5] gap-1 text-base font-medium rounded-lg'>
              <svg
                width='14'
                height='14'
                viewBox='0 0 14 14'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M1.75 7C4.375 7 7 4.375 7 1.75C7 4.375 9.625 7 12.25 7C9.625 7 7 9.625 7 12.25C7 9.625 4.375 7 1.75 7Z'
                  stroke='#B53535'
                  strokeWidth='0.875'
                  strokeLinejoin='round'
                />
                <path
                  d='M1.16699 11.3753C1.6531 11.3753 2.62533 10.4031 2.62533 9.91699C2.62533 10.4031 3.59755 11.3753 4.08366 11.3753C3.59755 11.3753 2.62533 12.3476 2.62533 12.8337C2.62533 12.3476 1.6531 11.3753 1.16699 11.3753Z'
                  stroke='#B53535'
                  strokeWidth='0.875'
                  strokeLinejoin='round'
                />
                <path
                  d='M9.33301 2.91699C9.91634 2.91699 11.083 1.75033 11.083 1.16699C11.083 1.75033 12.2497 2.91699 12.833 2.91699C12.2497 2.91699 11.083 4.08366 11.083 4.66699C11.083 4.08366 9.91634 2.91699 9.33301 2.91699Z'
                  stroke='#B53535'
                  strokeWidth='0.875'
                  strokeLinejoin='round'
                />
              </svg>

              <span>Generate using AI</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentDetailsPage;
