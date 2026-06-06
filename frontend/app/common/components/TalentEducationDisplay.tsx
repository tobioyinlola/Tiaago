import { LuDot } from "react-icons/lu";

import { cn } from "../utils";
import { TalentPortfolioEducation } from "../types";

type TalentEducationDisplayProps = {
  education: TalentPortfolioEducation;
  children?: React.ReactNode;
  className?: string;
};

const TalentEducationDisplay = ({
  education: { school, program, degree, start_date, end_date },
  children,
  className,
}: TalentEducationDisplayProps) => {
  const yearFrom = start_date?.split("-")[0];
  const yearTo = end_date?.split("-")[0];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className='w-[50px] h-[50px] bg-[#EFF7FC] rounded-[5px] flex items-center justify-center'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='26'
          height='23'
          viewBox='0 0 26 23'
          fill='none'
        >
          <path
            d='M1.3335 6.95833C1.3335 8.52374 10.7907 12.7917 13.0002 12.7917C15.2096 12.7917 24.6668 8.52375 24.6668 6.95833C24.6668 5.39292 15.2096 1.125 13.0002 1.125C10.7907 1.125 1.3335 5.39292 1.3335 6.95833Z'
            stroke='#427BA0'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
          <path
            d='M6 10.4585L6.28759 17.0549C6.2925 17.1677 6.30504 17.2804 6.33646 17.3888C6.45245 17.7889 6.67219 18.1537 7.01158 18.397C9.60689 20.2568 16.3931 20.2568 18.9884 18.397C19.3278 18.1537 19.5475 17.7889 19.6635 17.3888C19.695 17.2804 19.7075 17.1677 19.7124 17.0549L20 10.4585'
            stroke='#427BA0'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
          <path
            d='M23.667 8.7085C23.667 8.29428 23.3312 7.9585 22.917 7.9585C22.5028 7.9585 22.167 8.29428 22.167 8.7085H23.667ZM21.2503 20.6825L21.98 20.8558L21.2503 20.6825ZM24.5837 20.6825L25.3134 20.5092L24.5837 20.6825ZM22.167 8.7085V16.8836H23.667V8.7085H22.167ZM21.98 20.8558C22.1524 20.1302 22.4483 19.4698 22.7612 18.8574C23.0518 18.2888 23.4176 17.6578 23.6146 17.1591L22.2194 16.6081C22.0568 17.0198 21.782 17.4772 21.4255 18.1749C21.0913 18.8289 20.7336 19.6127 20.5206 20.5092L21.98 20.8558ZM25.3134 20.5092C25.1004 19.6127 24.7427 18.8289 24.4085 18.1749C24.052 17.4772 23.7772 17.0198 23.6146 16.6081L22.2194 17.1591C22.4164 17.6578 22.7822 18.2888 23.0728 18.8574C23.3857 19.4698 23.6816 20.1302 23.854 20.8558L25.3134 20.5092ZM23.285 21.3752H22.549V22.8752H23.285V21.3752ZM20.5206 20.5092C20.3774 21.112 20.3082 21.8505 20.8279 22.3718C21.0723 22.6169 21.3765 22.7349 21.6536 22.7964C21.9299 22.8576 22.2368 22.8752 22.549 22.8752V21.3752C22.2791 21.3752 22.0981 21.3585 21.9784 21.3319C21.8594 21.3056 21.8596 21.2821 21.8901 21.3127C21.9325 21.3552 21.9245 21.3886 21.9191 21.3312C21.9122 21.2572 21.9193 21.1112 21.98 20.8558L20.5206 20.5092ZM23.854 20.8558C23.9146 21.1112 23.9218 21.2572 23.9149 21.3312C23.9095 21.3886 23.9014 21.3552 23.9438 21.3127C23.9743 21.2821 23.9746 21.3056 23.8556 21.3319C23.7359 21.3585 23.5549 21.3752 23.285 21.3752V22.8752C23.5971 22.8752 23.9041 22.8576 24.1804 22.7964C24.4575 22.7349 24.7617 22.6169 25.0061 22.3718C25.5258 21.8505 25.4566 21.112 25.3134 20.5092L23.854 20.8558Z'
            fill='#427BA0'
          />
        </svg>
      </div>
      <div className='text-secondary-black text-sm'>
        {/* <p className='text-gray-700 font-medium'>{school}</p> */}
        <h5 className='text-primary-black text-base font-medium'>{program}</h5>
        <div className='flex items-center whitespace-nowrap'>
          <p>{degree}</p>
          <LuDot className='mx-2 text-2xl' />
          <p>
            {yearFrom && yearTo
              ? `${yearFrom} - ${yearTo}`
              : yearFrom
              ? `${yearFrom} - Present`
              : ""}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
};

export default TalentEducationDisplay;
