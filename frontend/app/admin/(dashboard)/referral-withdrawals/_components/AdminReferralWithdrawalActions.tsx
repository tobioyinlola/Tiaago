"use client";
import { toast } from "sonner";
import { useState } from "react";
import { ID } from "@/app/common/types";
import { useRouter } from "next/navigation";
import { type IconBaseProps } from "react-icons";
import { PiDotsThreeVerticalBold } from "react-icons/pi";

import {
  approveReferralWithdrawal,
  completeReferralWithdrawal,
  failReferralWithdrawal,
} from "@/app/common/services/profile";
import TrashIcon from "@/app/common/icons/TrashIcon";
import { useAlert } from "@/app/common/store/useAlert";
import { cn, handleFormSubmissionError } from "@/app/common/utils";

export const actionItems = [
  {
    Icon: (props: IconBaseProps) => (
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='24'
        height='24'
        viewBox='0 0 24 24'
        {...props}
      >
        <path d='M12.0007 10.2796C10.9807 10.2796 9.96074 10.0996 8.99074 9.74956C8.60074 9.60956 8.40074 9.17956 8.54074 8.78956C8.69074 8.39956 9.12074 8.19956 9.51074 8.33956C11.1207 8.91956 12.8907 8.91956 14.5007 8.33956C14.8907 8.19956 15.3207 8.39956 15.4607 8.78956C15.6007 9.17956 15.4007 9.60956 15.0107 9.74956C14.0407 10.0996 13.0207 10.2796 12.0007 10.2796Z' />
        <path d='M19.0703 22.75C18.5603 22.75 18.0003 22.6 17.4603 22.29L12.5803 19.58C12.2903 19.42 11.7203 19.42 11.4303 19.58L6.55031 22.29C5.56031 22.84 4.55031 22.9 3.78031 22.44C3.01031 21.99 2.57031 21.08 2.57031 19.95V5.86C2.57031 3.32 4.64031 1.25 7.18031 1.25H16.8303C19.3703 1.25 21.4403 3.32 21.4403 5.86V19.95C21.4403 21.08 21.0003 21.99 20.2303 22.44C19.8803 22.65 19.4803 22.75 19.0703 22.75ZM12.0003 17.96C12.4703 17.96 12.9303 18.06 13.3003 18.27L18.1803 20.98C18.6903 21.27 19.1603 21.33 19.4603 21.15C19.7603 20.97 19.9303 20.54 19.9303 19.95V5.86C19.9303 4.15 18.5303 2.75 16.8203 2.75H7.18031C5.47031 2.75 4.07031 4.15 4.07031 5.86V19.95C4.07031 20.54 4.24031 20.98 4.54031 21.15C4.84031 21.32 5.30031 21.27 5.82031 20.98L10.7003 18.27C11.0703 18.06 11.5303 17.96 12.0003 17.96Z' />
        <path d='M19.0703 22.75C18.5603 22.75 18.0003 22.6 17.4603 22.29L12.5803 19.58C12.2903 19.42 11.7203 19.42 11.4303 19.58L6.55031 22.29C5.56031 22.84 4.55031 22.9 3.78031 22.44C3.01031 21.99 2.57031 21.08 2.57031 19.95V5.86C2.57031 3.32 4.64031 1.25 7.18031 1.25H16.8303C19.3703 1.25 21.4403 3.32 21.4403 5.86V19.95C21.4403 21.08 21.0003 21.99 20.2303 22.44C19.8803 22.65 19.4803 22.75 19.0703 22.75ZM12.0003 17.96C12.4703 17.96 12.9303 18.06 13.3003 18.27L18.1803 20.98C18.6903 21.27 19.1603 21.33 19.4603 21.15C19.7603 20.97 19.9303 20.54 19.9303 19.95V5.86C19.9303 4.15 18.5303 2.75 16.8203 2.75H7.18031C5.47031 2.75 4.07031 4.15 4.07031 5.86V19.95C4.07031 20.54 4.24031 20.98 4.54031 21.15C4.84031 21.32 5.30031 21.27 5.82031 20.98L10.7003 18.27C11.0703 18.06 11.5303 17.96 12.0003 17.96Z' />
      </svg>
    ),
    text: "Approve Request" as const,
  },
  {
    Icon: (props: IconBaseProps) => (
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='24'
        height='24'
        viewBox='0 0 24 24'
        {...props}
      >
        <path d='M14.2209 21.6303C13.0409 21.6303 11.3709 20.8003 10.0509 16.8303L9.33086 14.6703L7.17086 13.9503C3.21086 12.6303 2.38086 10.9603 2.38086 9.78031C2.38086 8.61031 3.21086 6.93032 7.17086 5.60032L15.6609 2.77032C17.7809 2.06032 19.5509 2.27032 20.6409 3.35032C21.7309 4.43032 21.9409 6.21032 21.2309 8.33032L18.4009 16.8203C17.0709 20.8003 15.4009 21.6303 14.2209 21.6303ZM7.64086 7.03032C4.86086 7.96032 3.87086 9.06032 3.87086 9.78031C3.87086 10.5003 4.86086 11.6003 7.64086 12.5203L10.1609 13.3603C10.3809 13.4303 10.5609 13.6103 10.6309 13.8303L11.4709 16.3503C12.3909 19.1303 13.5009 20.1203 14.2209 20.1203C14.9409 20.1203 16.0409 19.1303 16.9709 16.3503L19.8009 7.86032C20.3109 6.32032 20.2209 5.06032 19.5709 4.41032C18.9209 3.76032 17.6609 3.68032 16.1309 4.19032L7.64086 7.03032Z' />
        <path d='M10.1108 14.4C9.92078 14.4 9.73078 14.33 9.58078 14.18C9.29078 13.89 9.29078 13.41 9.58078 13.12L13.1608 9.53C13.4508 9.24 13.9308 9.24 14.2208 9.53C14.5108 9.82 14.5108 10.3 14.2208 10.59L10.6408 14.18C10.5008 14.33 10.3008 14.4 10.1108 14.4Z' />
      </svg>
    ),
    text: "Complete Request" as const,
  },
  {
    text: "Fail Request" as const,
    Icon: TrashIcon,
  },
];

const AdminReferralWithdrawalActions = ({ id }: { id: ID }) => {
  const router = useRouter();
  const setAlert = useAlert(s => s.setAlert);
  const [loading, setLoading] = useState(false);
  const handleClick = async (action: (typeof actionItems)[number]["text"]) => {
    if (loading) return;
    let asyncAction: typeof approveReferralWithdrawal;
    switch (action) {
      case "Approve Request":
        asyncAction = approveReferralWithdrawal;
        break;
      case "Complete Request":
        asyncAction = completeReferralWithdrawal;
        break;
      case "Fail Request":
        asyncAction = failReferralWithdrawal;
        break;
    }
    setAlert({
      icon: "info",
      title: "Confirm action",
      message:
        "Are you sure you want to " +
        action.toLowerCase().replace(" request", "") +
        " this request?",
      buttonAction: async () => {
        setLoading(true);
        const response = await asyncAction(id);
        setLoading(false);
        if (response.success) {
          toast.success("Request processed successfully");
          router.refresh();
        } else {
          setTimeout(() => {
            handleFormSubmissionError(response.error, undefined, setAlert);
          }, 100);
        }
      },
    });
  };
  return (
    <>
      <div className='dropdown dropdown-hover dropdown-left'>
        <div
          tabIndex={0}
          className='cursor-pointer'
          aria-label='open menu'
          role='button'
        >
          <PiDotsThreeVerticalBold className='text-xl' />
        </div>
        <ul
          tabIndex={0}
          className='dropdown-content z-[1] menu shadow bg-base-100 rounded-lg w-max px-[2px] py-[18px]'
        >
          {actionItems.map(({ Icon, text }) => (
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

export default AdminReferralWithdrawalActions;
