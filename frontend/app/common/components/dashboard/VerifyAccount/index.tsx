import Image from "next/image";
import VerifyAccountModal from "./VerifyAccountModal";

import { BasePageProps } from "@/app/common/types";

const VerifyAccount = ({ as = "recruiter" }: { as?: BasePageProps["as"] }) => {
  return (
    <div className='bg-verify-pattern bg-no-repeat bg-bottom bg-[#1C3477] rounded-xl p-8 text-white mb-8 flex max-md:flex-col justify-between'>
      <div>
        <div className='flex gap-2 items-center'>
          <h2 className='font-space-grotesk font-semibold text-2xl'>
            Verify your Profile!
          </h2>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
          >
            <path
              d='M19 8C20.6569 8 22 6.65685 22 5C22 3.34315 20.6569 2 19 2C17.3431 2 16 3.34315 16 5C16 6.65685 17.3431 8 19 8Z'
              fill='#F7931D'
            />
            <path
              opacity='0.4'
              d='M19 9.5C16.52 9.5 14.5 7.48 14.5 5C14.5 4.09 14.77 3.25 15.24 2.55C14.22 2.2 13.13 2 12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 10.87 21.8 9.78 21.45 8.76C20.75 9.23 19.91 9.5 19 9.5Z'
              fill='#F7931D'
            />
          </svg>
        </div>
        <p className='text-base mt-2 text-[#E2FDFF]'>
          Complete Your Profile Verification to Unlock More Opportunities
        </p>
      </div>
      <VerifyAccountModal as={as} />
    </div>
  );
};

export const DashboardWelcome = ({
  as = "recruiter",
}: {
  as?: BasePageProps["as"];
}) => {
  return (
    <div className='relative bg-[#4C5CE8] rounded-xl pl-[22px] py-7 text-white flex max-md:flex-col justify-between'>
      <Image
        className='object-right-bottom object-contain'
        fill
        src='/assets/images/lines.png'
        alt=''
      />
      <div>
        <div className='flex gap-2 items-center'>
          <h2 className='font-semibold text-base md:text-2xl'>
            <span className='capitalize'>{as}</span> Dashboard
          </h2>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
          >
            <path
              d='M19 8C20.6569 8 22 6.65685 22 5C22 3.34315 20.6569 2 19 2C17.3431 2 16 3.34315 16 5C16 6.65685 17.3431 8 19 8Z'
              fill='#F7931D'
            />
            <path
              opacity='0.4'
              d='M19 9.5C16.52 9.5 14.5 7.48 14.5 5C14.5 4.09 14.77 3.25 15.24 2.55C14.22 2.2 13.13 2 12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 10.87 21.8 9.78 21.45 8.76C20.75 9.23 19.91 9.5 19 9.5Z'
              fill='#F7931D'
            />
          </svg>
        </div>
        <p className='text-sm md:text-base mt-2 text-white'>
          Your Journey Starts Here!
        </p>
      </div>
    </div>
  );
  1;
};

export default VerifyAccount;
