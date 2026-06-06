"use client";
import { toast } from "sonner";
import { PiDotsThreeVerticalBold } from "react-icons/pi";

import { cn } from "@/app/common/utils";
import { jobOptionsItems } from "../constants/jobOptionItems";

const JobOptionsModal = () => {
  const handleClick = (action: (typeof jobOptionsItems)[number]["text"]) => {
    toast.info(`${action} feature coming soon...`);
  };
  return (
    <>
      <div className='dropdown dropdown-hover dropdown-left'>
        <div
          tabIndex={0}
          className='w-6 h-6 cursor-pointer'
          aria-label='open menu'
          role='button'
        >
          <PiDotsThreeVerticalBold className='text-2xl' />
        </div>
        <ul
          tabIndex={0}
          className='dropdown-content z-[1] menu shadow bg-base-100 rounded-lg w-max px-[2px] py-[18px]'
        >
          {jobOptionsItems.map(({ Icon, text }) => (
            <li key={text}>
              <button
                className={cn(
                  "flex items-center gap-6 text-[13px] font-medium text-[#7F7F7F] hover:text-[#292D32] fill-[#7F7F7F] hover:fill-[#292D32] hover:bg-[#D9DDFF66] px-4 py-2 min-w-[190px]"
                )}
                onClick={() => handleClick(text)}
              >
                <Icon className='text-2xl' />
                {text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default JobOptionsModal;
