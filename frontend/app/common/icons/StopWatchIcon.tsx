import { IconBaseProps } from "react-icons";

import { cn } from "../utils";

const StopWatchIcon = ({ size = 24, className, ...props }: IconBaseProps) => {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill='none'
      {...props}
      className={cn("text-[#9DA3A8]", className)}
    >
      <path
        d='M1 21H12C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.36745 3 3.49744 6.50005 3 11'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M17.5 4.5L18.5 3.5M4.5 3.5L5.5 4.5'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M15.5001 8L12.5608 10.9393M12.5608 10.9393C12.2893 10.6679 11.9143 10.5 11.5001 10.5C10.6717 10.5 10.0001 11.1716 10.0001 12C10.0001 12.8284 10.6717 13.5 11.5001 13.5C12.3285 13.5 13.0001 12.8284 13.0001 12C13.0001 11.5858 12.8322 11.2108 12.5608 10.9393Z'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M11.5 2.5V1'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M9.5 1H13.5'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M1 14H4'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M1 18H6'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
};

export default StopWatchIcon;
