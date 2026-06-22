"use client";
import { toast } from "sonner";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Modal from "@/app/common/components/Modal";
import { useAlert } from "@/app/common/store/useAlert";
import { updateTalent } from "@/app/common/services/talents";
import { handleFormSubmissionError } from "@/app/common/utils";
import FileInput from "@/app/common/components/Forms/FileInput";
import { useTalentStore } from "@/app/talents/(dashboard)/store";

type ResumeUpdateModalProps = {
  modalRef: React.RefObject<HTMLDialogElement>;
  onSuccess?: VoidFunction;
  refresh?: boolean;
};

const ResumeUpdateModal = ({
  modalRef,
  onSuccess,
  refresh,
}: ResumeUpdateModalProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const setProfile = useTalentStore(state => state.setProfile);
  const setAlert = useAlert(state => state.setAlert);

  const handleUpdate = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const formData = new FormData(formRef.current!);
    toast.dismiss();
    try {
      const res = await updateTalent(formData, "profile");
      setIsLoading(false);
      if (!res.success) {
        handleFormSubmissionError(res.error, undefined, setAlert);
      } else {
        setProfile(res.data!);
        modalRef.current?.close();
        if (refresh) router.refresh();
        toast.success("Resume updated successfully");
        onSuccess?.();
      }
    } catch (err: any) {
      setIsLoading(false);
      handleFormSubmissionError(err, undefined, setAlert);
    }
  };

  return (
    <Modal
      id='update-resume-modal'
      modalRef={modalRef}
      disableClose={isLoading}
      autoHeight
    >
      <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold'>
        Update Resume
      </h3>
      <p className='text-[#999] text-sm -tracking-[0.1px]'>
        Kindly update your resume
      </p>
      <Formik initialValues={{ resume: "" }} onSubmit={handleUpdate}>
        {({ handleSubmit, values }) => (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className='flex flex-col gap-5 my-5 w-[80svw] max-w-md'
          >
            <FileInput
              name='resume'
              label='Upload Resume'
              accept='.doc, .docx, .pdf'
              required
              acceptText='Pdf or Doc  (max. 10mb)'
              value={values.resume}
            />
            <Button
              type='submit'
              className='btn btn-primary w-full'
              loading={isLoading}
            >
              {isLoading ? "Updating..." : "Update Resume"}
            </Button>
          </form>
        )}
      </Formik>
    </Modal>
  );
};

export default ResumeUpdateModal;
