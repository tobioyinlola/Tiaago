import { notFound, redirect } from "next/navigation";

import {
  initializeQuizAttempt,
  talentGetAssessment,
} from "@/app/common/services/assessment";
import Quiz from "../_components/Quiz";
import { QuizAttemptInitialize } from "@/app/common/types";
import { getCurrentUser } from "@/app/common/services/profile";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import TakeQuizContainer from "../_components/TakeQuizContainer";
import QuitAssessmentButton from "../_components/QuitAssessmentButton";
import { getSubscriptionPlan } from "@/app/common/services/subscription";

type Props = {
  params: Promise<{
    "assessment-id": string;
  }>;
};

export const generateMetadata = async ({ params }: Props) => {
  const { "assessment-id": quizSlug } = await params;
  const quiz = await talentGetAssessment(quizSlug);
  return {
    title: quiz?.name ?? "Take Skill Assessment",
    description: "Take a skill assessment to improve your skills",
  };
};

const TakeSkillAssessmentPage = async ({ params }: Props) => {
  const { "assessment-id": quizSlug } = await params;
  let currentUser = useTalentStore.getState().profile;
  if (!currentUser) {
    currentUser = (await getCurrentUser("talent")).currentUser;
    useTalentStore.setState({ profile: currentUser });
  }
  if (!currentUser?.subscribed_plan)
    return redirect("/talents/settings?tab=subscription");
  const subscriptionPlan = await getSubscriptionPlan(
    currentUser.subscribed_plan.plan_id
  );
  if (subscriptionPlan?.sub_type !== "PR")
    return redirect("/talents/settings?tab=subscription");
  const quiz = await talentGetAssessment(quizSlug);
  if (!quiz) return notFound();
  let quizInitializeData: QuizAttemptInitialize;
  try {
    quizInitializeData = await initializeQuizAttempt(quizSlug);
  } catch (error: any) {
    const message = error?.response?.data?.detail ?? error?.message;
    return (
      <div className='p-8 max-md:px-1 flex flex-col gap-6 sm:gap-8'>
        <div className='border-b border-gray-200 pb-1'>
          <h1 className='text-2xl mb-1 font-space-grotesk font-semibold'>
            {quiz.name} Assessment
          </h1>
          <h4 className='text-gray-900 text-base'>
            An error occurred while initializing the assessment
          </h4>
        </div>
        <p className='text-gray-900 text-base'>{message}</p>
      </div>
    );
  }
  const endTime = new Date();
  endTime.setMinutes(endTime.getMinutes() + quiz.minutes);
  const noOfQuestions = quizInitializeData.no_of_questions;
  const questions = quizInitializeData.questions.slice(0, noOfQuestions);
  return (
    <TakeQuizContainer>
      <div className='p-8 max-md:px-1 flex flex-col gap-6 sm:gap-8'>
        <div className='border-b border-gray-200 pb-1'>
          <div className='flex items-center justify-between'>
            <h1 className='text-2xl mb-1 font-space-grotesk font-semibold'>
              {quiz.name} Assessment
            </h1>
            <QuitAssessmentButton
              quizAttempt={quizInitializeData.id}
              lastQuestion={questions.at(questions.length - 1)?.id}
              className='max-sm:hidden'
            />
          </div>
          <h4 className='text-gray-900 text-base'>
            Kindly begin your assessment
          </h4>
        </div>
        <QuitAssessmentButton
          quizAttempt={quizInitializeData.id}
          lastQuestion={questions.at(questions.length - 1)?.id}
          className='sm:hidden'
        />
        <Quiz
          quizAttempt={quizInitializeData.id}
          endTime={endTime}
          questions={questions}
        />
      </div>
    </TakeQuizContainer>
  );
};

export default TakeSkillAssessmentPage;
