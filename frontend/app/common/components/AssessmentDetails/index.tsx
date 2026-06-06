import Link from "next/link";
import { BsDot } from "react-icons/bs";

import {
  getAssessmentResultsList,
  getCompanyAssessment,
  initiateAssessmentPayment,
  getCompanyAssessmentCooldownStatus,
} from "@/app/common/services/assessment";

import {
  getAssessmentDurationInMinutes,
  handleServerApiCallError,
} from "@/app/common/utils";
import { notFound } from "next/navigation";
import NotesIcon from "@/app/common/icons/NotesIcon";
import StopWatchIcon from "@/app/common/icons/StopWatchIcon";
import LicencePinIcon from "@/app/common/icons/LicencePinIcon";
import StartAssessmentBtn from "@/app/talents/(dashboard)/assessments/_components/StartAssessmentBtn";
import { CodingTaskSection, PromiseResolvedType } from "@/app/common/types";

type AssessmentDetailsProps = {
  assessmentId: string;
  jobId: string;
  mode: "talent-verification" | "job-application";
  initiateAssessmentPaymentResponse?: PromiseResolvedType<
    ReturnType<typeof initiateAssessmentPayment>
  >;
  daysLeftToTakeAssessment?: number;
};

const AssessmentDetails = async ({
  assessmentId,
  jobId,
  mode,
  initiateAssessmentPaymentResponse,
  daysLeftToTakeAssessment,
}: AssessmentDetailsProps) => {
  const assessment = await getCompanyAssessment(assessmentId).catch(() => null);
  if (!assessment) notFound();

  const mcqSection = assessment.sections.find(s => s.type === "MCQ");
  const codingTaskSection = assessment.sections.find(
    s => s.type === "CODING_TASK"
  ) as CodingTaskSection | undefined;

  const resultList = await getAssessmentResultsList(assessmentId).catch(
    async e => {
      const error = await handleServerApiCallError(e);
      console.log(
        "Get assessment results list error (assessment details): ",
        error
      );
      return null;
    }
  );
  const results = resultList?.results?.at(0);
  const mcqResult = results?.stats?.mcq;

  const assessmentDurationInMinutes =
    getAssessmentDurationInMinutes(assessment);
  const codingTaskDurationInMinutes = getAssessmentDurationInMinutes(
    assessment,
    true
  );

  const codingTask = codingTaskSection?.coding_tasks?.at(0);

  const totalDurationInMinutes =
    assessmentDurationInMinutes +
    (codingTask ? 1 : 0) * codingTaskDurationInMinutes;

  const paymentUrl = initiateAssessmentPaymentResponse?.success
    ? initiateAssessmentPaymentResponse.data?.payment_url
    : undefined;

  const getStartButtonHref = () => {
    if (mode === "job-application") {
      return `/jobs/${jobId}/assessment/${assessmentId}/mcq`;
    }
    return `/assessments/${assessmentId}/mcq`;
  };

  const getTutorialHref = () => {
    if (mode === "job-application") {
      return `/jobs/${jobId}/assessment/${assessmentId}/tutorial`;
    }
    return `/assessments/tutorials/mcq?assessment_id=${assessmentId}`;
  };

  const getCodingTaskHref = () => {
    if (mode === "job-application") {
      return `/jobs/${jobId}/assessment/${assessmentId}/coding-task`;
    }
    return `/assessments/${assessmentId}/coding-task`;
  };

  return (
    <>
      <div className='bg-white rounded-xl px-8 py-11 flex max-md:flex-col-reverse justify-between gap-3 md:gap-10'>
        <div className='md:max-w-[713px]'>
          <h2 className='text-2xl md:text-3xl font-semibold mb-3 md:mb-6 text-primary-black'>
            {assessment.title}
          </h2>
          <h5 className='text-secondary-black font-medium text-sm md:text-xl'>
            {assessment.description}
          </h5>

          <div className='flex items-center gap-2 text-base text-[#9DA3A8] mt-4 border-[#EAECF0] pb-6 border-b'>
            <NotesIcon size={22} />
            <p className='text-sm'>
              {(mcqSection?.mcq_questions?.length ?? 0) +
                (codingTaskSection ? 1 : 0)}{" "}
              questions
            </p>
            <BsDot aria-hidden />
            <StopWatchIcon />
            <p className='text-sm'>{totalDurationInMinutes} minutes</p>
          </div>
        </div>
      </div>

      <div className='bg-white rounded-xl px-2 md:px-8 py-8 md:py-11 mt-8'>
        <h4 className='text-xl md:text-2xl font-medium mb-4 md:mb-6 text-primary-black'>
          Instructions
        </h4>

        <div className='collapse collapse-arrow bg-white mt-2 border border-[#EAECF0] rounded-xl'>
          <input type='checkbox' defaultChecked />
          <div className='collapse-title flex items-center gap-3 px-4 pt-6 pb-0'>
            <NotesIcon className='text-primary max-md:hidden' size={48} />
            <NotesIcon className='text-primary md:hidden' size={32} />
            <div>
              <h3 className='text-base md:text-xl font-medium text-[#141B34] mb-1 md:mb-2'>
                Multiple-Choice Questions (MCQs)
              </h3>
              <h6 className='text-secondary-black text-xs md:text-base font-medium'>
                {mcqSection?.name ?? "Section 1"}
              </h6>
            </div>
          </div>
          <div className='collapse-content pt-6 md:pl-16 px-4 text-sm md:text-xl'>
            <hr className='border-[#EAECF0] mb-5 -mx-20' />
            <p className='text-secondary-black mb-3'>
              <strong className='font-medium text-primary-black'>
                Time Limit:
              </strong>{" "}
              {assessmentDurationInMinutes} minutes
            </p>
            <p className='text-secondary-black mb-3'>
              <strong className='font-medium text-primary-black'>
                Format:
              </strong>{" "}
              {mcqSection?.mcq_questions?.length || 0} multiple-choice questions
            </p>
            <p className='text-secondary-black mb-4'>
              <strong className='font-medium text-primary-black'>
                Scoring:
              </strong>{" "}
              You will receive a score out of 100%, contributing to your overall
              assessment performance.
            </p>
            <h6 className='font-medium text-primary-black mb-2'>
              Instructions:
            </h6>
            <ul className='text-secondary-black list-disc list-inside'>
              <li>Read each question carefully.</li>
              <li>
                Select the most appropriate answer from the options provided.
              </li>
              <li>Complete all questions within the time limit.</li>
            </ul>

            <div className='mt-7 mb-4 flex max-sm:flex-col items-center gap-6'>
              {mode === "talent-verification" ? (
                <StartAssessmentBtn
                  assessmentId={assessmentId}
                  href={getStartButtonHref()}
                  checkoutUrl={paymentUrl}
                  daysLeftToTakeAssessment={daysLeftToTakeAssessment}
                >
                  Start Assessment
                </StartAssessmentBtn>
              ) : (
                <Link
                  href={getStartButtonHref()}
                  className='btn btn-primary px-8 py-3 w-full sm:max-w-[253px] font-medium'
                >
                  Start Assessment
                </Link>
              )}
              <Link
                href={getTutorialHref()}
                className='btn btn-primary btn-outline hover:!bg-white hover:!text-primary px-8 py-3 w-full sm:max-w-[253px] font-medium'
              >
                Take Tutorial
              </Link>
            </div>
          </div>
        </div>

        {/* Coding Task Section */}
        {!!(codingTaskSection && codingTask) && (
          <div className='collapse collapse-arrow bg-white mt-8 border border-[#EAECF0] rounded-xl'>
            <input type='checkbox' />
            <div className='collapse-title flex items-center gap-3 px-4 pt-6 pb-0'>
              <LicencePinIcon className='max-md:hidden' />
              <LicencePinIcon className='md:hidden' size={32} />
              <div>
                <h3 className='text-base md:text-xl font-medium text-[#141B34] mb-1 md:mb-2'>
                  Coding Task
                </h3>
                <h6 className='text-secondary-black text-xs md:text-base font-medium'>
                  {codingTaskSection.name && "Section 2"}
                </h6>
              </div>
            </div>
            <div className='collapse-content pt-6 md:pl-16 px-4 text-sm md:text-xl'>
              <hr className='border-[#EAECF0] mb-5 -mx-20' />
              <p className='text-secondary-black mb-3'>
                <strong className='font-medium text-primary-black'>
                  Time Limit:
                </strong>{" "}
                {codingTaskDurationInMinutes} minutes
              </p>
              <p className='text-secondary-black mb-3'>
                <strong className='font-medium text-primary-black'>
                  Format:
                </strong>{" "}
                {codingTask.title ?? "Coding challenge"}
              </p>
              <p className='text-secondary-black mb-4'>
                <strong className='font-medium text-primary-black'>
                  Objective:
                </strong>{" "}
                {codingTask.description}
              </p>
              <h6 className='font-medium text-primary-black mb-2'>
                Submission:
              </h6>
              <ul className='text-secondary-black list-disc list-inside'>
                <li>Write your code in the provided coding environment.</li>
                <li>
                  Submit your final solution within the allotted time. Only the
                  final submission will be evaluated.
                </li>
              </ul>

              {!!mcqResult && (
                <div className='mt-7 mb-4 flex max-sm:flex-col items-center gap-6'>
                  {mode === "talent-verification" ? (
                    <StartAssessmentBtn
                      assessmentId={assessmentId}
                      href={getCodingTaskHref()}
                    >
                      Start Assessment
                    </StartAssessmentBtn>
                  ) : (
                    <Link
                      href={getCodingTaskHref()}
                      className='btn btn-primary px-8 py-3 w-full sm:max-w-[253px] font-medium'
                    >
                      Start Assessment
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AssessmentDetails;
