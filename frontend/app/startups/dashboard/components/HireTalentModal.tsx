import Link from "next/link";
import { Fragment } from "react";

import { ButtonModal } from "@/app/common/components/Modal";

const steps = [
  {
    title: "Post a Job",
    description:
      "Clearly outline the responsibilities, qualifications, and skills required for the position.",
  },
  {
    title: "Screen and Evaluate Candidates",
    description:
      "Review resumes, conduct a multi-stage interview process incorporating skills-based tests, case studies, and cultural compatibility checks.",
  },
  {
    title: "Contract and Onboarding",
    description:
      "Finalize the employment contract and ensure a smooth onboarding process to integrate the new team member effectively!",
  },
];

const HireTalentModal = () => {
  return (
    <ButtonModal
      buttonText='Hire Talent'
      disablePadding
      id='hire-talent-modal'
      buttonClassName='btn-primary'
    >
      <div>
        <div className='py-5 px-6'>
          <h3 className='text-[26px] leading-[38px] font-semibold -tracking-[0.5px]'>
            Hire a Talent
          </h3>
          <p className='text-gray-900 text-base font-normal mb-4'>
            These are the steps needed to hire a talent on Tiaago
          </p>
        </div>
        {steps.map(({ title, description }, i) => (
          <Fragment key={i}>
            <div className='flex bg-[#D9DDFF] p-4 gap-4 items-center'>
              <div className='bg-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold'>
                {i + 1}
              </div>
              <h5 className='text-base font-medium'>{title}</h5>
            </div>
            <div className='card card-bordered mx-6 my-8'>
              <div className='card-body py-4 px-6'>
                <p className='text-gray-500 text-base'>{description}</p>
              </div>
            </div>
          </Fragment>
        ))}
        <div className='p-6'>
          <Link
            href='/startups/dashboard/jobs/create'
            className='btn btn-primary w-full'
          >
            Get Started
          </Link>
        </div>
      </div>
    </ButtonModal>
  );
};

export default HireTalentModal;
