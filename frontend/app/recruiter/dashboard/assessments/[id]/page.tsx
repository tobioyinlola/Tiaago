import Link from "next/link";
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
import AssessmentDetailActions from "./_components/AssessmentDetailActions";

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

        <div className='flex items-center gap-4'>
          {assessment.published && (
            <Link
              href={`/recruiter/dashboard/assessments/${assessment.id}/submissions`}
              className='text-sm text-primary font-medium'
            >
              View Submissions
            </Link>
          )}
          <AssessmentDetailActions
            assessmentId={assessment.id}
            published={!!assessment.published}
            hasSections={assessment.sections.length > 0}
          />
        </div>
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
              <span
                className={`px-2 py-[2px] rounded-full text-xs font-medium italic ${
                  assessment.published
                    ? "bg-[#EAFAF1] text-[#2ABA67]"
                    : "bg-[#FFEDED] text-[#FF4A4A]"
                }`}
              >
                {assessment.published ? "Published" : "Draft"}
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
          <h3 className='text-base font-semibold text-primaryBlack'>Sections</h3>
        </div>

        {assessment.sections.length === 0 ? (
          <div className='bg-white rounded-2xl px-8 pb-10 pt-2 border border-[#EAECF0] flex flex-col items-center'>
            <NoQuestionsIcon />
            <p className='mt-2 mb-1 text-base font-bold text-center text-primaryBlack'>
              No questions added yet
            </p>
            <p className='text-[#6C757D] text-sm text-center'>
              This draft was never finished in the wizard -- start a new assessment to add
              sections.
            </p>
          </div>
        ) : (
          <div className='bg-white rounded-2xl p-6 border border-[#EAECF0] space-y-3'>
            {assessment.sections.map(section => (
              <div
                key={section.id}
                className='flex items-center justify-between border border-[#EAECF0] rounded-lg px-4 py-3'
              >
                <p className='text-sm font-medium text-primaryBlack'>{section.name}</p>
                <p className='text-xs text-[#9DA3A8]'>
                  {section.type.replaceAll("_", " ")} --{" "}
                  {section.type === "MCQ"
                    ? section.mcq_questions?.length ?? 0
                    : section.type === "CODING_TASK"
                    ? section.coding_tasks?.length ?? 0
                    : section.open_ended_questions?.length ?? 0}{" "}
                  question(s)
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentDetailsPage;
