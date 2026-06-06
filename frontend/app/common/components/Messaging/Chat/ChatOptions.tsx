"use client";

import { useRef } from "react";
import { FiEye } from "react-icons/fi";
import { SlLogout } from "react-icons/sl";
import { useRouter } from "next/navigation";
import { CgFileDocument } from "react-icons/cg";
import { PiDotsThreeVerticalBold } from "react-icons/pi";

import ProfileModal from "../../ProfileModal";
import { SimpleUser, TalentRole, User } from "@/app/common/types";
import CreateContractModal from "../../CreateContractModal";
import { toggleCreateContractModal } from "@/app/common/utils";

export type ChatOptionsProps = {
  user: SimpleUser | User;
  online: boolean;
  currentUserType: User["user_type"];
  roles: TalentRole[];
  disableScheduleMeeting?: boolean;
};

const ChatOptions = ({
  online,
  user,
  currentUserType,
  roles,
  disableScheduleMeeting,
}: ChatOptionsProps) => {
  const router = useRouter();
  const modalRef = useRef<HTMLDialogElement>(null);
  const createContractCondition =
    currentUserType === "CR" && user.user_type === "T";
  const isUser = "country" in user;
  // const userID = !isUser ? user.id : user.pk;
  const userID = user.id;
  const options = [
    {
      text: "View Profile" as const,
      Icon: FiEye,
    },
    ...(!createContractCondition
      ? []
      : [
          {
            text: "Create Contract" as const,
            Icon: CgFileDocument,
          },
        ]),
    {
      text: "Close Chat" as const,
      Icon: SlLogout,
    },
  ];

  const onOptionClick = (option: (typeof options)[number]["text"]) => {
    if (option === "Close Chat") {
      router.push("?");
    } else if (option === "Create Contract") {
      toggleCreateContractModal();
    } else {
      modalRef.current?.showModal();
    }
  };
  return (
    <>
      <div className='ml-auto dropdown dropdown-hover dropdown-left'>
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
          {options.map(({ text, Icon }) => {
            return (
              <li key={text}>
                <button
                  className='flex items-center gap-6 text-[13px] font-medium text-[#7F7F7F] hover:text-[#292D32] fill-[#7F7F7F] hover:fill-[#292D32] hover:bg-[#D9DDFF66] px-4 py-2 min-w-[190px]'
                  onClick={() => onOptionClick(text)}
                >
                  <Icon className='text-2xl' />
                  {text}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <ProfileModal
        {...{ online, user, modalRef, currentUserType, disableScheduleMeeting }}
      />
      {createContractCondition && (
        <CreateContractModal
          talentID={userID}
          name={`${user.first_name} ${user.last_name}`}
          buttonClassName='hidden'
          roles={roles}
          defaultRole={
            isUser
              ? roles.find(
                  role => role.title.toLowerCase() === user.role.toLowerCase()
                )?.id
              : undefined
          }
        />
      )}
    </>
  );
};

export default ChatOptions;
