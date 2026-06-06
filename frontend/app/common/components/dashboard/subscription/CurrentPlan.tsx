import { BiSolidCheckCircle } from "react-icons/bi";

import { cn } from "@/app/common/utils";

type CurrentPlanProps = {
  showCheckIcon?: boolean;
  planName?: string;
  className?: string;
};

const CurrentPlan = ({
  showCheckIcon,
  planName = "Free Plan",
  className,
}: CurrentPlanProps) => {
  return (
    <div
      className={cn(
        "items-center flex gap-4 bg-[#F5F5F5] border border-[#EAECF0] p-4 pr-5",
        className
      )}
    >
      <div className='w-8 h-8 rounded-full bg-white flex items-center justify-center'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='16'
          height='16'
          viewBox='0 0 16 16'
          fill='none'
        >
          <path
            d='M1.33398 9.66663L7.76214 12.8807C7.84959 12.9244 7.89332 12.9463 7.93919 12.9549C7.97981 12.9625 8.02149 12.9625 8.06212 12.9549C8.10798 12.9463 8.15171 12.9244 8.23917 12.8807L14.6673 9.66663M1.33398 6.3333L7.76214 3.11922C7.84959 3.07549 7.89332 3.05363 7.93919 3.04502C7.97981 3.0374 8.02149 3.0374 8.06212 3.04502C8.10798 3.05363 8.15171 3.07549 8.23917 3.11922L14.6673 6.3333L8.23917 9.54737C8.15171 9.5911 8.10798 9.61296 8.06212 9.62157C8.02149 9.62919 7.97981 9.62919 7.93919 9.62157C7.89332 9.61296 7.84959 9.5911 7.76214 9.54737L1.33398 6.3333Z'
            stroke='#344054'
            strokeWidth='1.33333'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </div>
      <h3 className='text-base font-medium'>{planName}</h3>
      {!!showCheckIcon && (
        <BiSolidCheckCircle className='text-[#067A6F] ml-auto text-xl' />
      )}
    </div>
  );
};

export default CurrentPlan;
