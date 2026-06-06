"use client";
import React from "react";
import Modal from "./Modal";

type CoverLetterModalProps = {
  modalRef: React.RefObject<HTMLDialogElement>;
  coverLetter: string;
};

const CoverLetterModal = ({ modalRef, coverLetter }: CoverLetterModalProps) => {
  return (
    <Modal
      id="cover-letter-modal"
      modalRef={modalRef}
      autoHeight
      className="max-w-2xl"
      scrollAreaClassName="flex flex-col"
    >
      <div className="w-full flex flex-col min-h-full">
        <h3 className="text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2">
          Cover Letter
        </h3>
        <p className="text-[#999] text-sm -tracking-[0.1px] mb-6">
          Read through the talent&apos;s cover letter.
        </p>
        <article className="border-t pt-6">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: coverLetter }}
          />
        </article>
      </div>
    </Modal>
  );
};

export default CoverLetterModal;
