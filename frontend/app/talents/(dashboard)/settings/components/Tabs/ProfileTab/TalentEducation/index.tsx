"use client";
import EducationMenu from "./EducationMenu";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import TalentEducationModalForm from "./TalentEducationModalForm";
import TalentEducationDisplay from "@/app/common/components/TalentEducationDisplay";

const TalentEducation = () => {
  const educations = useTalentStore(s => s.portfolio?.education || []);
  return (
    <section className='w-full max-md:max-w-md max-md:mx-auto dashboard-content-constraint'>
      <h2 className='text-base font-bold text-primary-black'>Education</h2>
      <p className='text-sm text-secondary-black mb-6 md:border-b border-outline pb-4'>
        Upload your academic qualifications
      </p>

      <div className='flex items-center gap-3 flex-wrap'>
        {educations.map((edu, i) => (
          <TalentEducationDisplay
            education={edu}
            key={i}
            className='rounded-lg border-[#EAECF0] border py-6 pl-8 pr-4 w-full'
          >
            <EducationMenu education={edu} />
          </TalentEducationDisplay>
        ))}
        {!educations.length && (
          <p className='text-sm text-secondary-black'>
            No education added yet.
          </p>
        )}
      </div>
      <div className='w-full flex justify-end'>
        <TalentEducationModalForm buttonClassName='ml-auto mt-5 btn-primary text-sm' />
      </div>
    </section>
  );
};

export default TalentEducation;
