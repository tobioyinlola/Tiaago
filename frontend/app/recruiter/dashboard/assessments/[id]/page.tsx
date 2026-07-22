import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ListChecks, Timer, Target, Users, FileQuestion, Code2, PenLine } from "lucide-react";

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

const sectionTypeMeta: Record<string, { label: string; Icon: typeof FileQuestion }> = {
  MCQ: { label: "Multiple choice", Icon: FileQuestion },
  CODING_TASK: { label: "Coding task", Icon: Code2 },
  OPEN_ENDED: { label: "Open-ended", Icon: PenLine },
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

  const stats = [
    { title: "Questions", value: noOfQuestions, Icon: ListChecks },
    { title: "Duration", value: `${getAssessmentDurationInMinutes(assessment)}mins`, Icon: Timer },
    { title: "Passing Grade", value: `${assessment.passing_grade}%`, Icon: Target },
    { title: "Attempts", value: 0, Icon: Users },
  ];

  return (
    <div className='text-black max-w-7xl'>
      <DisplayErrorMessages errors={errors} />
      <div className='flex flex-wrap items-center justify-between gap-4 mb-6'>
        <div>
          <Link
            href='/recruiter/dashboard/assessments'
            className='text-sm text-secondary-black hover:text-primary'
          >
            Assessments
          </Link>
          <h1 className='text-2xl font-semibold font-space-grotesk text-primaryBlack mt-1'>
            Assessment Details
          </h1>
        </div>

        <div className='flex items-center gap-4'>
          {assessment.published && (
            <Link
              href={`/recruiter/dashboard/assessments/${assessment.id}/submissions`}
              className='flex items-center gap-1 text-sm text-primary font-medium hover:underline'
            >
              View Submissions
              <ArrowRight className='w-3.5 h-3.5' />
            </Link>
          )}
          <AssessmentDetailActions
            assessmentId={assessment.id}
            published={!!assessment.published}
            hasSections={assessment.sections.length > 0}
          />
        </div>
      </div>

      <div className='bg-white rounded-2lg p-6 border border-[#EAECF0]'>
        <div className='flex flex-wrap justify-between items-start gap-4 pb-6 border-b border-[#EAECF0]'>
          <div>
            <h2 className='text-lg md:text-2xl font-semibold text-primaryBlack mb-3 font-space-grotesk'>
              {assessment.title}
            </h2>
            <div className='flex gap-2 items-center flex-wrap'>
              <span className='text-primary bg-primary/10 px-2.5 py-1 rounded-full text-xs font-medium capitalize'>
                {assessment.difficulty_level.toLowerCase()}
              </span>
              <span className='text-primary bg-primary/10 px-2.5 py-1 rounded-full text-xs font-medium capitalize'>
                {assessment.assessment_type === "MCQ"
                  ? "MCQs"
                  : assessment.assessment_type
                      .replaceAll("_", " ")
                      .toLowerCase()}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  assessment.published
                    ? "bg-badge-green-bg text-badge-green-text"
                    : "bg-[#F5F6F7] text-secondary-black"
                }`}
              >
                {assessment.published ? "Published" : "Draft"}
              </span>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-8'>
          {stats.map((stat, index) => (
            <div
              key={index}
              className='rounded-xl border border-[#EAECF0] p-5 flex flex-col items-center text-center gap-2'
            >
              <div className='w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center'>
                <stat.Icon className='w-4 h-4 text-primary' />
              </div>
              <p className='text-base font-semibold text-primaryBlack'>{stat.value}</p>
              <h3 className='text-secondary-black text-xs'>{stat.title}</h3>
            </div>
          ))}
        </div>
      </div>

      <div className='mt-10'>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-base font-semibold text-primaryBlack'>Sections</h3>
        </div>

        {assessment.sections.length === 0 ? (
          <div className='bg-white rounded-2lg px-8 pb-10 pt-2 border border-[#EAECF0] flex flex-col items-center'>
            <NoQuestionsIcon />
            <p className='mt-2 mb-1 text-base font-bold text-center text-primaryBlack'>
              No questions added yet
            </p>
            <p className='text-secondary-black text-sm text-center'>
              This draft was never finished in the wizard -- start a new assessment to add
              sections.
            </p>
          </div>
        ) : (
          <div className='bg-white rounded-2lg p-6 border border-[#EAECF0] space-y-3'>
            {assessment.sections.map(section => {
              const meta = sectionTypeMeta[section.type] ?? { label: section.type, Icon: FileQuestion };
              const questionCount =
                section.type === "MCQ"
                  ? section.mcq_questions?.length ?? 0
                  : section.type === "CODING_TASK"
                  ? section.coding_tasks?.length ?? 0
                  : section.open_ended_questions?.length ?? 0;
              return (
                <div
                  key={section.id}
                  className='flex items-center justify-between border border-[#EAECF0] rounded-xl px-4 py-3 hover:border-primary/30 transition-colors'
                >
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 rounded-full bg-[#F5F6F7] flex items-center justify-center shrink-0'>
                      <meta.Icon className='w-4 h-4 text-secondary-black' />
                    </div>
                    <p className='text-sm font-medium text-primaryBlack'>{section.name}</p>
                  </div>
                  <p className='text-xs text-secondary-black'>
                    {meta.label} &middot; {questionCount} question{questionCount === 1 ? "" : "s"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentDetailsPage;
