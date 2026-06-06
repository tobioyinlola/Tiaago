"use client";

import { cn } from "@/app/common/utils";
import ExperienceMenu from "./ExperienceMenu";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import WorkExperienceModalForm from "./WorkExperienceModalForm";
import WorkExperienceDisplay from "@/app/common/components/WorkExperienceDisplay";

const TalentWorkExperiences = ({
  isTalentVerification,
  onNextClick,
}: {
  isTalentVerification?: boolean;
  onNextClick?: VoidFunction;
}) => {
  const experiences = useTalentStore(s => s.portfolio?.experience || []);
  return (
    <section
      id='work-experiences'
      className='w-full max-md:max-w-md max-md:mx-auto dashboard-content-constraint'
    >
      <h2
        className={cn(
          "text-base font-bold text-primary-black",
          isTalentVerification && "hidden"
        )}
      >
        Work Experiences
      </h2>
      <p
        className={cn(
          "text-sm text-secondary-black mb-6 md:border-b border-outline pb-4",
          isTalentVerification && "hidden"
        )}
      >
        Kindly enter your latest job positions.
      </p>

      <div className='flex items-center gap-3 flex-wrap'>
        {experiences.map((we, i) => (
          <WorkExperienceDisplay
            experience={we}
            key={i}
            className='rounded-lg border-[#EAECF0] border py-6 pl-8 pr-4 w-full'
          >
            <ExperienceMenu experience={we} />
          </WorkExperienceDisplay>
        ))}
        {!experiences.length && (
          <p className='text-sm text-secondary-black'>
            No work experience added yet.
          </p>
        )}
      </div>
      <div className='w-full flex justify-end mt-5'>
        <WorkExperienceModalForm buttonClassName='ml-auto btn-primary text-sm' />
        {!!onNextClick && (
          <button
            onClick={onNextClick}
            disabled={isTalentVerification && !experiences.length}
            className='ml-3 btn text-sm border-primary disabled:border-current bg-white'
          >
            Next
          </button>
        )}
      </div>
    </section>
  );
};

export default TalentWorkExperiences;
