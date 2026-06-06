import Link from "next/link";
import { PropsWithChildren } from "react";

import {
  getQuizAttempt,
  talentGetAssessment,
} from "@/app/common/services/assessment";
import { notFound } from "next/navigation";
import { cn, toId } from "@/app/common/utils";
import { PASS_THRESHOLD } from "@/app/common/constants";
import { getCurrentUser } from "@/app/common/services/profile";

type Props = {
  params: Promise<{
    quiz_attempt: string;
  }>;
};

export const generateMetadata = async ({ params }: Props) => {
  const { quiz_attempt } = await params;
  const attempt = await getQuizAttempt(quiz_attempt);
  if (!attempt) return { title: "Assessment Result" };
  return {
    title: `${attempt.quiz} Assessment Result`,
  };
};

const AssessmentResultPage = async ({ params }: Props) => {
  const { quiz_attempt } = await params;
  const attempt = await getQuizAttempt(quiz_attempt);
  if (!attempt) return notFound();
  const { currentUser } = await getCurrentUser();
  const isTalent = currentUser.user_type === "T";
  const name = isTalent
    ? `${currentUser.first_name ?? ""} ${currentUser.last_name ?? ""}`.trim()
    : attempt.talent;
  const correctAnswers = Math.min(
    attempt.correct_answers,
    attempt.no_of_questions
  );
  const percentage = (correctAnswers / attempt.no_of_questions) * 100;
  const started = attempt.timestamp;
  const completed = attempt.updated;
  const timeTaken = new Date(completed).getTime() - new Date(started).getTime();
  const minutes = Math.floor(timeTaken / 60000);
  const seconds = ((timeTaken % 60000) / 1000).toFixed(0);
  const quiz = await talentGetAssessment(toId(attempt.quiz));
  const quizeTotalMinutes = quiz?.minutes ?? 0;
  const percentageTime = (minutes / quizeTotalMinutes) * 100;
  const passedQuiz = percentage > PASS_THRESHOLD;
  return (
    <div className='p-8 max-md:px-1 flex flex-col gap-6 sm:gap-8'>
      <h1 className='text-2xl font-semibold border-b border-gray-200 pb-1'>
        Assessment Result
      </h1>
      <div className='sm:border sm:py-28 w-full'>
        <div className='max-w-md mx-auto'>
          <div className='border-b border-gray-200 pb-6 mb-10'>
            <h2 className='text-2xl mb-1 font-space-grotesk font-semibold'>
              {attempt.quiz} Assessment
            </h2>
            <p className='text-gray-900 text-base'>
              This result shows that {name} just completed the{" "}
              {attempt.quiz.toLowerCase()} assessment
            </p>
          </div>
          <h4 className='text-gray-900 text-lg font-semibold mb-1'>
            Assessment Details
          </h4>
          <p className='text-gray-500 text-sm'>Here is your result</p>
          <StatBox className={cn(!passedQuiz && "bg-[#F2994A12]")}>
            Score : {percentage.toFixed(2)}%
          </StatBox>
          <StatBox
            className={cn(
              percentageTime >= 80 && "bg-[#F2994A12]",
              percentageTime >= 50 && "bg-[#FDE68A]",
              percentageTime > 50 && "bg-[#ECFDF3]"
            )}
          >
            Time Completed : {minutes}m {seconds}s
          </StatBox>
          <StatBox className={cn(!passedQuiz && "bg-[#F2994A12]")}>
            {correctAnswers} / {attempt.no_of_questions} Questions
          </StatBox>
          <div className='divider mt-10 mb-8' />
          {isTalent && (
            <Link
              href={`/talents/skill-assessment/${
                passedQuiz ? "case-study-project" : ""
              }`}
              className='btn btn-primary text-base font-medium max-sm:w-full'
            >
              {passedQuiz ? "Continue" : "Exit"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

const StatBox = ({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) => (
  <div
    className={cn(
      "py-5 pl-8 w-full mt-6 text-base font-medium bg-[#ECFDF3]",
      className
    )}
  >
    {children}
  </div>
);

export default AssessmentResultPage;
