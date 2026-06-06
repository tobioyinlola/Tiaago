import Link from "next/link";
import { Fragment } from "react";

import { BasePageProps } from "@/app/common/types";
import { ButtonModal } from "@/app/common/components/Modal";

const steps = [
  {
    title: "Skill Assessment",
    description:
      "This will help us gauge your current skill level. The assessment will be tailored to your specific skills.",
  },
  {
    title: "Case Study Project",
    description:
      "This will give you an opportunity to demonstrate your skills in a real-world context.",
  },
  {
    title: "Subscription plan",
    description:
      "Choose the subscription that best suits your needs and start connecting with your perfect match today!",
  },
];

const VerifyAccountModal = ({
  as = "startup",
}: {
  as?: BasePageProps["as"];
}) => {
  return (
    <ButtonModal
      disablePadding
      id='verify-account-modal'
      buttonText='Verify Account'
      icon={
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='20'
          height='20'
          viewBox='0 0 20 20'
          fill='none'
        >
          <path
            opacity='0.4'
            d='M13.491 1.66699H6.50768C3.47435 1.66699 1.66602 3.47533 1.66602 6.50866V13.4837C1.66602 16.5253 3.47435 18.3337 6.50768 18.3337H13.4827C16.516 18.3337 18.3243 16.5253 18.3243 13.492V6.50866C18.3327 3.47533 16.5243 1.66699 13.491 1.66699Z'
            className='fill-[#F17300] group-hover:fill-white'
          />
          <path
            d='M8.94909 13.5668C8.79075 13.5668 8.63242 13.5085 8.50742 13.3835C8.26576 13.1418 8.26576 12.7418 8.50742 12.5001L11.0074 10.0001L8.50742 7.50013C8.26576 7.25846 8.26576 6.85846 8.50742 6.6168C8.74909 6.37513 9.14909 6.37513 9.39076 6.6168L12.3324 9.55846C12.5741 9.80013 12.5741 10.2001 12.3324 10.4418L9.39076 13.3835C9.26576 13.5085 9.10742 13.5668 8.94909 13.5668Z'
            className='fill-[#F17300] group-hover:fill-white'
          />
        </svg>
      }
      buttonClassName='btn-outline bg-white border-[#F17300] text-[#F17300] hover:!bg-[#F17300] hover:border-[#F17300] group w-fit max-md:mt-[14px]'
    >
      <div>
        <div className='py-5 px-6'>
          <h3 className='text-[26px] leading-[38px] font-semibold -tracking-[0.5px]'>
            Verification Steps
          </h3>
          <p className='text-gray-900 text-base font-normal mb-4'>
            Kindly verify your account to enable you apply for jobs
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
            href={`/${as}s/dashboard/skill-assessment`}
            className='btn btn-primary w-full'
          >
            Get Started
          </Link>
        </div>
      </div>
    </ButtonModal>
  );
};

export default VerifyAccountModal;
