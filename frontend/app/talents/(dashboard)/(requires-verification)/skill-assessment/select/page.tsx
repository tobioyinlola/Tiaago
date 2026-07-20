import { getCurrentUser } from "@/app/common/services/profile";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import QuitAssessmentButton from "../_components/QuitAssessmentButton";
import StartAssessmentButton from "../_components/StartAssessmentButton";
import { getAvailableAssessments } from "@/app/common/services/assessment";

export const metadata = {
  title: "Select Skill Assessment Quiz",
};

const SelectAssessmentPage = async () => {
  let currentUser = useTalentStore.getState().profile;
  if (!currentUser) {
    currentUser = (await getCurrentUser("talent")).currentUser;
    useTalentStore.setState({ profile: currentUser });
  }
  const assessments = await getAvailableAssessments();
  return (
    <div className='p-8 max-md:px-1 flex flex-col gap-6 sm:gap-8'>
      <div className='border-b border-gray-200 pb-1'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl mb-1 font-space-grotesk font-semibold'>
            Select a Skill Assessment
          </h1>
        </div>
        <h4 className='text-gray-900 text-base'>
          Kindly select your preferred assessment.
        </h4>
      </div>
      <QuitAssessmentButton className='sm:hidden' />
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
        {assessments.map(assessment => (
          <div key={assessment.slug} className='border border-gray-200 p-4'>
            <h3 className='text-gray-900 text-lg font-medium'>
              {assessment.name}
            </h3>
            <p className='text-gray-500 text-sm'>{assessment.description}</p>
            <div className='text-gray-500 text-base flex items-center gap-3 mb-4'>
              <p>Number of questions: {assessment.question_count}</p>
              <p>Duration: {assessment.minutes} minutes</p>
            </div>
            <StartAssessmentButton
              href={`/talents/skill-assessment/${assessment.slug}/`}
              text='Start Assessment'
            />
          </div>
        ))}

        {assessments.length === 0 && (
          <EmptyState
            className='col-span-2 w-full'
            text='There are no available assessments for you at the moment.'
          />
        )}
      </div>
    </div>
  );
};

export default SelectAssessmentPage;
