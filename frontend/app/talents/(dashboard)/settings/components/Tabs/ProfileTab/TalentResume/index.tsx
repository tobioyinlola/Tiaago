"use client";
import { useRef } from "react";
import { PiUploadSimpleBold } from "react-icons/pi";

import ResumeMenu from "./ResumeMenu";
import { cn } from "@/app/common/utils";
import ResumeUpdateModal from "./ResumeUpdateModal";
import FileDisplay from "@/app/common/components/FileDisplay";

export type TalentResumeProps = {
  fileName: string;
  // dateAdded: string;
  url?: string;
  className?: string;
  refresh?: boolean;
};

const TalentResume = ({
  fileName,
  url,
  className,
  refresh,
}: TalentResumeProps) => {
  const updateResumeRef = useRef<HTMLDialogElement>(null);
  const openUpdateResumeModal = () => {
    updateResumeRef.current?.showModal();
  };
  return (
    <section
      className={cn("max-md:max-w-md max-md:mx-auto", className)}
      id='resume'
    >
      <h2 className='text-base font-bold text-primary-black'>Resume</h2>
      <p className='text-sm text-secondary-black mb-6 md:border-b border-outline pb-4'>
        Kindly upload your latest resume.
      </p>
      <FileDisplay fileName={fileName} className={cn(!url && "hidden")}>
        <ResumeMenu url={url} openUpdateResumeModal={openUpdateResumeModal} />
      </FileDisplay>
      {!url && (
        <button className='btn btn-primary' onClick={openUpdateResumeModal}>
          <PiUploadSimpleBold className='text-2xl' />
          Upload Resume
        </button>
      )}
      <ResumeUpdateModal modalRef={updateResumeRef} refresh={refresh} />
    </section>
  );
};

export default TalentResume;
