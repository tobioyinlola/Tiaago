"use client";
import { toast } from "sonner";
import { useRef } from "react";
import JsFileDownloader from "js-file-downloader";
import { PiDotsThreeVerticalBold } from "react-icons/pi";

import { cn } from "@/app/common/utils";
import ResumePrivacyModal from "./ResumePrivacyModal";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import { resumeMenuItems } from "../../../../constants/resumeMenuItems";

const ResumeMenu = ({
  url,
  openUpdateResumeModal,
}: {
  url?: string;
  openUpdateResumeModal: VoidFunction;
}) => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const resumeURL = useTalentStore(state => state.profile?.resume) ?? url;

  const downloadResume = () => {
    if (!resumeURL) {
      toast.error("No resume uploaded");
      return;
    }
    new JsFileDownloader({
      url: resumeURL,
    })
      .then(() => toast.success("download successful"))
      .catch(error => {
        window.open(resumeURL, "_blank");
      });
  };

  const handleClick = (item: (typeof resumeMenuItems)[number]["label"]) => {
    if (item === "Download") downloadResume();
    else if (item === "Change Privacy") modalRef.current?.showModal();
    else if (item === "Replace File") openUpdateResumeModal();
  };
  return (
    <>
      <div className='dropdown dropdown-hover max-md:dropdown-left'>
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
          {resumeMenuItems.map(({ label, Icon }) => {
            const isExternalLink = ["View"].includes(label);
            return (
              <li key={label}>
                <a
                  className={cn(
                    "flex items-center gap-6 text-[13px] font-medium text-[#7F7F7F] hover:text-[#292D32] fill-[#7F7F7F] hover:fill-[#292D32] hover:bg-[#D9DDFF66] px-4 py-2 min-w-[190px]",
                    label === "Delete" &&
                      "text-error fill-error hover:text-white hover:fill-white hover:bg-error"
                  )}
                  href={isExternalLink ? resumeURL : undefined}
                  target={isExternalLink ? "_blank" : undefined}
                  rel={isExternalLink ? "noreferrer" : undefined}
                  onClick={() => handleClick(label)}
                >
                  <Icon className='text-2xl' />
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
      <ResumePrivacyModal modalRef={modalRef} />
    </>
  );
};

export default ResumeMenu;
