"use client";
import { toast } from "sonner";
import { Button } from "react-daisyui";
import { useRef, useState } from "react";

import { useAlert } from "@/app/common/store/useAlert";
import { SkillAssessmentQuiz } from "@/app/common/types";
import WarningIcon from "@/app/common/icons/WarningIcon";
import { ButtonModal } from "@/app/common/components/Modal";
import { handleFormSubmissionError } from "@/app/common/utils";
import { updateAssessmentStatus } from "@/app/common/services/assessment";

const ToggleAssessmentStatusModal = ({ slug, roll_out }: SkillAssessmentQuiz) => {
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);
  const setAlert = useAlert(state => state.setAlert);
  const [isPublished, setIsPublished] = useState(roll_out);
  
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { roll_out } = await updateAssessmentStatus(slug, !isPublished);
      toast.success(
        `Assessment ${roll_out ? "unpublished" : "published"} successfully`
      );
      setIsPublished(roll_out);
    } catch (error) {
      handleFormSubmissionError(error, undefined, setAlert)
    } finally {
      setLoading(false);
      modalRef.current?.close();
    }
  };

  return (
    <>
      <ButtonModal
        buttonText={isPublished ? "Unpublish" : "Publish"}
        buttonClassName={isPublished ? "btn-error" : "btn-primary"}
        modalRef={modalRef}
        autoHeight
        id={`update-assessment-status-modal-${slug}`}
        disableClose={loading}
        className='w-full'
      >
        <div className='flex flex-col items-center'>
          <WarningIcon className='mb-8' />
          <h3 className='text-[32px] leading-[38px] -tracking-[0.5px] font-bold mb-4'>
            Are you sure?
          </h3>
          <p className='text-[#999] text-sm -tracking-[0.1px]'>
            Do you you want to {isPublished ? "unpublish" : "publish"} this
            assessment?
          </p>
        </div>
        <div className='modal-action'>
          <Button
            loading={loading}
            className='btn btn-primary w-full'
            onClick={handleSubmit}
          >
            {loading ? "Submitting..." : isPublished ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </ButtonModal>
    </>
  );
};

export default ToggleAssessmentStatusModal;
