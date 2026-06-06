import { notFound } from "next/navigation";

import {
  getQuizAttempts,
  getSkillAssessments,
} from "@/app/common/services/assessment";
import { getCurrentUser } from "@/app/common/services/profile";
import PreviousAssessments from "./_components/PreviousAssessments";
import StartAssessmentButton from "./_components/StartAssessmentButton";

export const metadata = {
  title: "Skill Assessment",
};

const instructions = [
  "Each question is timed",
  "Do not use search engines or get help from others",
  "Once you have submitted an answer, you cannot go back",
  "You may exit the test, but the timer will continue to run",
  "You can retake the assessment after thirty days.",
];

const SkillAssessmentPage = async () => {
  notFound();
  const currentUser = (await getCurrentUser("talent")).currentUser;
  const quizAttempts = await getQuizAttempts();
  const skillAssessments = await getSkillAssessments();
  return (
    <div className='p-8 max-md:px-1 flex flex-col gap-8'>
      <div className='border-b border-gray-200 pb-1'>
        <h1 className='text-2xl mb-1 font-space-grotesk font-semibold'>
          Skill Assessment
        </h1>
        <h4 className='text-gray-900 text-base'>
          Kindly complete your profile verification to unlock more opportunities
        </h4>
      </div>
      <h3 className='text-gray-900 text-lg font-medium'>
        About the Assessment
      </h3>
      <article>
        <p className='text-gray-500 text-base'>
          The first step in getting verified is to take a skill assessment. This
          will help us gauge your current skill level and identify areas where
          you may need further development. The assessment will be tailored to
          the specific skills you choose to verify. We recommend taking the
          assessment in a quiet and distraction-free environment.
          <br />
          Instructions
        </p>
        <ul className='mt-4 list-disc list-inside'>
          {instructions.map((instruction, index) => (
            <li key={index} className='text-gray-500 text-base list-item'>
              {instruction}
            </li>
          ))}
        </ul>
      </article>
      <StartAssessmentButton
        href='/talents/skill-assessment/select'
        isPremiumUser
        text='Get Started'
      />
      <PreviousAssessments
        quizAttempts={quizAttempts}
        skillAssessments={skillAssessments}
        role={currentUser.role}
      />
    </div>
  );
};

export default SkillAssessmentPage;
