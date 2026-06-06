"use client";
import "react-quill-new/dist/quill.snow.css";
// import "react-phone-input-2/lib/style.css";

import { useRef } from "react";
import { toast } from "sonner";
import { Formik } from "formik";
import { Button } from "react-daisyui";
import { useRouter } from "next/navigation";

import {
  coverLetterFormFields,
  coverLetterInitialValues,
  coverLetterValidationSchema,
} from "../../constants/jobApplicationForm";

import { ID } from "@/app/common/types";
import Modal from "@/app/common/components/Modal";
import { useAlert } from "@/app/common/store/useAlert";
import { useUserStore } from "@/app/common/store/useUser";
import { submitJobApplication } from "@/app/common/services/jobs";
import { cn, handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import ResumeUpdateModal from "@/app/talents/(dashboard)/settings/components/Tabs/ProfileTab/TalentResume/ResumeUpdateModal";

type JobApplicationModalProps = {
  id: ID;
  role: string;
  company: string;
  buttonText?: string;
  buttonClassName?: string;
  requiresAssessment?: boolean;
  assessmentId?: string;
};

const JobApplicationModal = ({
  id,
  role,
  company,
  buttonText = "Apply now",
  buttonClassName = "btn-primary",
  requiresAssessment = false,
  assessmentId,
}: JobApplicationModalProps) => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const updateResumeModalRef = useRef<HTMLDialogElement>(null);
  const setAlert = useAlert(s => s.setAlert);
  const talent = useUserStore(s => s.profile);
  const router = useRouter();

  const onApply = () => {
    if (!talent) {
      setAlert({
        message: "Please sign in to apply for this job.",
        icon: "info",
        title: "Sign in",
        buttonText: "Sign in",
        buttonLink: `/talents/signin?next=${window.location.pathname}`,
        secondaryButton: {
          text: "Close",
        },
      });
      return;
    }
    if (talent.user_type !== "T") {
      setAlert({
        message: "Please sign in as a talent to apply for this job.",
        icon: "info",
        title: "Sign in as a talent",
        buttonText: "Sign in",
        buttonLink: `/talents/signin?next=${window.location.pathname}`,
        secondaryButton: {
          text: "Close",
        },
      });
      return;
    }
    if (!talent?.resume) {
      setAlert({
        message: "Please upload a resume to apply for a job.",
        icon: "info",
        title: "No resume found",
        buttonText: "Upload resume",
        buttonAction: () => updateResumeModalRef.current?.showModal(),
        secondaryButton: {
          text: "Close",
        },
      });
      return;
    }
    
    // If assessment is required, redirect to assessment flow
    if (requiresAssessment && assessmentId) {
      router.push(`/jobs/${id}/assessment/${assessmentId}`);
      return;
    }
    
    // Otherwise, show the cover letter modal
    modalRef.current?.showModal();
  };

  const onResumeUpdateSuccess = () => {
    modalRef.current?.showModal();
  };

  return (
    <>
      <button
        className={cn("btn mt-6 rounded-xl", buttonClassName)}
        onClick={onApply}
      >
        {buttonText}
      </button>
      <Modal id='job-application-modal' modalRef={modalRef}>
        <Formik
          initialValues={coverLetterInitialValues}
          onSubmit={({ cover_letter }, { setSubmitting, resetForm }) => {
            submitJobApplication(id, cover_letter)
              .then(res => {
                if (!res.success) {
                  handleFormSubmissionError(res.error, undefined, setAlert);
                  return;
                }
                setSubmitting(false);
                resetForm();
                modalRef.current?.close();
                setAlert({
                  message: "Application submitted successfully!",
                  icon: "success",
                  title: "Application submitted",
                  secondaryButton: {
                    text: "Close",
                  },
                  buttonText: "View applications",
                  buttonLink: "/talents/applications",
                });
              })
              .catch(err => {
                handleFormSubmissionError(err, undefined, setAlert);
                setSubmitting(false);
              });
          }}
          validationSchema={coverLetterValidationSchema}
        >
          {({ handleSubmit, errors, touched, isSubmitting, values }) => (
            <form onSubmit={handleSubmit} className='max-w-[calc(100svw-4rem)]'>
              <h3 className='text-2xl font-bold -tracking-[0.5px] font-space-grotesk'>
                {role}
              </h3>
              <p className='text-sm text-[#636568] -tracking-[0.5px] mt-2 leading-[22px]'>
                {company}
              </p>
              <div className='divider mb-6 mt-2' />
              <h1 className='text-[26px] font-semibold -tracking-[0.5px]'>
                Cover Letter
              </h1>
              <p className='text-sm text-gray-500'>
                Please check to see if all information details are correct to
                avoid wrong processing.
              </p>
              <div className='divider mb-6 mt-5' />

              <div className='flex flex-col gap-6 mb-6'>
                {coverLetterFormFields.map(
                  ({ name, className: c, ...props }) => {
                    const className = cn("px-1", c);
                    const value = values[name];
                    return (
                      <FormikField
                        key={name}
                        {...{ name, value, className, ...props }}
                        error={errors[name]}
                        touched={touched[name]}
                        richtextProps={{ maxChars: 3000 }}
                      />
                    );
                  }
                )}
              </div>

              <Button
                loading={isSubmitting}
                color='primary'
                type='submit'
                className='mt-auto rounded-xl w-full'
              >
                {isSubmitting ? "Submitting" : "Submit Application"}
              </Button>
            </form>
          )}
        </Formik>
      </Modal>
      <ResumeUpdateModal
        modalRef={updateResumeModalRef}
        onSuccess={onResumeUpdateSuccess}
      />
    </>
  );
};

export default JobApplicationModal;
