import Link from "next/link";
import { BsClock } from "react-icons/bs";
import { PropsWithChildren } from "react";
import { notFound } from "next/navigation";

import {
  cn,
  getAssessmentDurationInMinutes,
  handleServerApiCallError,
} from "@/app/common/utils";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import RetryIcon from "@/app/common/icons/RetryIcon";
import NotesIcon from "@/app/common/icons/NotesIcon";
import { getCurrentUser } from "@/app/common/services/profile";
import LicencePinIcon from "@/app/common/icons/LicencePinIcon";
import AssessmentResultActions from "./AssessmentResultActions";
import { CompanySkillAssessment, Talent } from "@/app/common/types";
import { SuccessIconWithConfetti } from "@/app/common/icons/SuccessIcon";
import { getAssessmentResultsList } from "@/app/common/services/assessment";

const AssessmentResults = async ({
  assessment,
  mode = "talent-verification",
  jobId,
  onComplete,
  tab,
  jobRole,
}: {
  assessment: CompanySkillAssessment;
  mode?: "talent-verification" | "job-application";
  jobId?: string;
  onComplete?: () => void;
  tab: "mcq" | "coding_task";
  jobRole?: string;
}) => {
  const currentUser = (await getCurrentUser("talent")).currentUser;
  const errors: DisplayErrorMessagesProps["errors"] = [];

  const resultList = await getAssessmentResultsList(assessment.id).catch(
    async e => {
      const error = await handleServerApiCallError(e);
      console.log(
        "Get assessment results list error (assessment results page): ",
        error
      );
      errors.push({
        message: error,
        title: "Error getting assessment results",
      });
      return null;
    }
  );
  const results = resultList?.results?.at(0);
  if (!results) notFound();

  const mcqSection = assessment.sections.find(s => s.type === "MCQ");
  const codingTaskSection = assessment.sections.find(
    s => s.type === "CODING_TASK"
  );

  const assessmentDurationInMinutes =
    getAssessmentDurationInMinutes(assessment);

  const mcqScore = results.stats?.mcq.percent ?? 0;
  const totalScore = (codingTaskSection ? results.total_score : mcqScore) ?? 0;
  const passedMcq = mcqScore >= assessment.passing_grade;
  const passed = totalScore >= assessment.passing_grade;

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div role='tablist' className='tabs font-poppins'>
        <span
          className={cn(
            "tab w-[calc((100vw-186px)/2)] md:w-[calc((100vw-360px)/2)]",
            codingTaskSection &&
              "w-[calc((100vw-372px)/2)] md:w-[calc((100vw-720px)/2)]"
          )}
        >
          &nbsp;
        </span>
        <Link
          href='?tab=mcq'
          role='tab'
          className={cn(
            "!w-max pl-0 pr-0",
            "mcq" === tab ? "tab tab-active" : "tab"
          )}
          aria-label='MCQ'
        >
          <div className='flex flex-col items-center w-full min-w-[186px] md:min-w-[360px]'>
            <NotesIcon className='text-primary' size={20} />
            <h6 className='text-sm font-medium text-primary-black mt-1'>
              Multiple-choice Questions
            </h6>

            <div
              className={cn(
                "rounded bg-[#5374E71A] h-2.5 w-full mt-5",
                "mcq" === tab && "bg-primary"
              )}
            />
          </div>
        </Link>

        <TabContent
          assessment_id={assessment.id.toString()}
          isLastSection={!codingTaskSection}
          passed={codingTaskSection ? passedMcq : passed}
          currentUser={currentUser}
          mode={mode}
          jobId={jobId}
          onComplete={onComplete}
          jobRole={jobRole}
        >
          <div className='border border-[#EAECF0] rounded-lg bg-white px-6 py-3'>
            <div className='flex items-center gap-2'>
              <NotesIcon className='text-[#77BAE7]' size={32} />
              <h4 className='text-primary-black text-lg md:text-[22px] font-medium'>
                {mcqSection?.mcq_questions?.length ?? 0}
              </h4>
            </div>

            <p className='text-sm md:text-base text-secondary-black'>
              Questions
            </p>
          </div>

          <div className='border border-[#EAECF0] rounded-lg bg-white px-6 py-3'>
            <div className='flex items-center gap-2'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='32'
                height='33'
                viewBox='0 0 32 33'
                fill='none'
              >
                <path
                  d='M20.1182 13.1765L14.4369 18.6298M9.49023 10.9865L11.8536 10.3145L10.0242 18.6878M18.1969 11.7171C19.7482 12.0605 20.7269 13.5738 20.3909 15.1105L19.7742 17.9371C19.4382 19.4738 17.9189 20.4345 16.3669 20.0905C14.8149 19.7478 13.8362 18.2338 14.1716 16.6971L14.7896 13.8711C15.1256 12.3345 16.6456 11.3738 18.1969 11.7171Z'
                  stroke='#427BA0'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
                <path
                  d='M16.0003 30.7292C23.9164 30.7292 30.3337 24.3119 30.3337 16.3958C30.3337 8.47975 23.9164 2.0625 16.0003 2.0625C8.08424 2.0625 1.66699 8.47975 1.66699 16.3958C1.66699 24.3119 8.08424 30.7292 16.0003 30.7292Z'
                  stroke='#427BA0'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
                <path
                  d='M14.6199 24.0407C19.4712 24.0407 23.4039 20.1079 23.4039 15.2567C23.4039 10.4054 19.4712 6.47266 14.6199 6.47266C9.76867 6.47266 5.83594 10.4054 5.83594 15.2567C5.83594 20.1079 9.76867 24.0407 14.6199 24.0407Z'
                  stroke='#427BA0'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
              <h4 className='text-primary-black text-lg md:text-[22px] font-medium'>
                {((codingTaskSection ? mcqScore : totalScore) || 0).toFixed(0)}%
              </h4>
            </div>

            <p className='text-sm md:text-base text-secondary-black'>Score</p>
          </div>

          <div className='border border-[#EAECF0] rounded-lg bg-white px-6 py-3'>
            <div className='flex items-center gap-2'>
              <BsClock className='text-[#2ECC71] text-3xl' />
              <h4 className='text-primary-black text-lg md:text-[22px] font-medium'>
                {results.time_taken ?? assessmentDurationInMinutes}:00
              </h4>
            </div>

            <p className='text-sm md:text-base text-secondary-black'>Time</p>
          </div>
        </TabContent>

        {codingTaskSection && (
          <>
            <Link
              href='?tab=coding_task'
              role='tab'
              className={cn(
                "!w-max",
                "coding_task" === tab ? "tab tab-active" : "tab"
              )}
              aria-label='Coding Task'
            >
              <div className='flex flex-col items-center min-w-[186px] md:min-w-[360px]'>
                <LicencePinIcon className='text-primary' size={20} />
                <h6 className='text-sm font-medium text-primary-black mt-1'>
                  Coding Task
                </h6>

                <div
                  className={cn(
                    "rounded bg-[#5374E71A] h-2.5 w-full mt-5",
                    "coding_task" === tab && "bg-primary"
                  )}
                />
              </div>
            </Link>
            <TabContent
              assessment_id={assessment.id.toString()}
              subtitle="Here's a quick overview of your performance on the coding task"
              isLastSection
              passed={passed}
              currentUser={currentUser}
              mode={mode}
              jobId={jobId}
              onComplete={onComplete}
              jobRole={jobRole}
              score={results.total_score ?? undefined}
            >
              {!!results.total_score && (
                <div className='border border-[#EAECF0] rounded-lg bg-white px-6 py-3'>
                  <div className='flex items-center gap-2'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='32'
                      height='33'
                      viewBox='0 0 32 33'
                      fill='none'
                    >
                      <path
                        d='M20.1182 13.1765L14.4369 18.6298M9.49023 10.9865L11.8536 10.3145L10.0242 18.6878M18.1969 11.7171C19.7482 12.0605 20.7269 13.5738 20.3909 15.1105L19.7742 17.9371C19.4382 19.4738 17.9189 20.4345 16.3669 20.0905C14.8149 19.7478 13.8362 18.2338 14.1716 16.6971L14.7896 13.8711C15.1256 12.3345 16.6456 11.3738 18.1969 11.7171Z'
                        stroke='#427BA0'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                      <path
                        d='M16.0003 30.7292C23.9164 30.7292 30.3337 24.3119 30.3337 16.3958C30.3337 8.47975 23.9164 2.0625 16.0003 2.0625C8.08424 2.0625 1.66699 8.47975 1.66699 16.3958C1.66699 24.3119 8.08424 30.7292 16.0003 30.7292Z'
                        stroke='#427BA0'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                      <path
                        d='M14.6199 24.0407C19.4712 24.0407 23.4039 20.1079 23.4039 15.2567C23.4039 10.4054 19.4712 6.47266 14.6199 6.47266C9.76867 6.47266 5.83594 10.4054 5.83594 15.2567C5.83594 20.1079 9.76867 24.0407 14.6199 24.0407Z'
                        stroke='#427BA0'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                    <h4 className='text-primary-black text-lg md:text-[22px] font-medium'>
                      {(totalScore || 0).toFixed(0)}%
                    </h4>
                  </div>

                  <p className='text-sm md:text-base text-secondary-black'>
                    Score
                  </p>
                </div>
              )}

              <div className='border border-[#EAECF0] rounded-lg bg-white px-6 py-3'>
                <div className='flex items-center gap-2'>
                  <BsClock className='text-[#2ECC71] text-3xl' />
                  <h4 className='text-primary-black text-lg md:text-[22px] font-medium'>
                    {results.time_taken ?? assessmentDurationInMinutes}:00
                  </h4>
                </div>

                <p className='text-sm md:text-base text-secondary-black'>
                  Time
                </p>
              </div>
            </TabContent>
          </>
        )}
        <span className='tab' />
      </div>
    </>
  );
};

export default AssessmentResults;

type TabContentProps = PropsWithChildren<{
  assessment_id: string;
  subtitle?: string;
  isLastSection?: boolean;
  passed?: boolean;
  currentUser: Talent;
  mode?: "talent-verification" | "job-application";
  jobId?: string;
  onComplete?: () => void;
  jobRole?: string;
  score?: number;
}>;

const TabContent = ({
  assessment_id,
  children,
  subtitle = "Here's a quick overview of your performance on the MCQs",
  isLastSection,
  passed,
  currentUser,
  mode = "talent-verification",
  jobId,
  jobRole,
  onComplete,
  score,
}: TabContentProps) => {
  const isJobApplication = mode === "job-application";
  return (
    <div role='tabpanel' className='tab-content pt-20 w-full pr-0'>
      <div className='flex flex-col justify-center items-center text-center max-w-[480px] m-auto pb-10'>
        {passed || isJobApplication ? (
          <SuccessIconWithConfetti />
        ) : (
          <RetryIcon />
        )}
        <h2 className='text-primary-black text-3xl md:text-[32px] font-semibold mt-3'>
          {isJobApplication
            ? `Assessment submitted`
            : isLastSection
            ? !score
              ? "Your assessment grading is in progress."
              : passed
              ? "Excellent work! You've completed your assessment"
              : "Oops! Better luck next time"
            : "You're doing great! Ready for the next challenge?"}
        </h2>

        <p className='text-sm mt-1.5 text-[#999999]'>
          {isJobApplication
            ? "Thank you for completing the assessment. The recruiter will review your responses and get back to you soon."
            : isLastSection
            ? !score
              ? "The results will be sent to you via mail"
              : passed
              ? "Explore more assessments and stand out among your peers"
              : "You can retake the assessment after 14 days."
            : subtitle}
        </p>

        <div className='flex items-center gap-8 mt-[35px]'>{children}</div>
      </div>

      <AssessmentResultActions
        assessment_id={assessment_id}
        isLastSection={!!isLastSection}
        passed={!!passed}
        currentUser={currentUser}
        mode={mode}
        jobId={jobId}
        onComplete={onComplete}
      />
    </div>
  );
};
