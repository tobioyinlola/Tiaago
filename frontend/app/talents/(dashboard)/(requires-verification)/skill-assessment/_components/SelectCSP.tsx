"use client";

import * as yup from "yup";
import { toast } from "sonner";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";
import { differenceInHours } from "date-fns";
import { BiSolidPencil } from "react-icons/bi";
import { useEffect, useRef, useState } from "react";

import {
  cn,
  handleFormSubmissionError,
  htmlToPlainText,
  showUpgradePlanModal,
} from "@/app/common/utils";
import {
  attemptCaseStudyProject,
  submitCaseStudyProject,
} from "@/app/common/services/case-study";
import ClockDisplay from "./ClockDisplay";
import Modal from "@/app/common/components/Modal";
import { useAlert } from "@/app/common/store/useAlert";
import { useMultiStep } from "@/app/common/store/useMultiStep";
import FormikField from "@/app/common/components/Forms/FormikField";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import { CaseStudyAttempt, CaseStudyProject, ID } from "@/app/common/types";

const SelectCSP = ({
  projects,
  isPremiumUser,
  attempts,
  defaultProject,
}: {
  projects: CaseStudyProject[];
  isPremiumUser: boolean;
  attempts: CaseStudyAttempt[];
  defaultProject?: ID;
}) => {
  const [attemptedProjects, setAttemptedProject] = useState(attempts);
  const { step: activeStepIndex, nextStep, prevStep, setStep } = useMultiStep();
  const setAlert = useAlert(state => state.setAlert);
  const modalRef = useRef<HTMLDialogElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const maxStepIndex = projects.length - 1;
  const activeProject = projects[activeStepIndex];
  const isAtLastStep = activeStepIndex === maxStepIndex;
  const prevAttempt = attemptedProjects.find(
    a =>
      a.project === activeProject.title &&
      differenceInHours(new Date(), new Date(a.created)) < 72
  );
  const hasAttemptedCurrentProject = !!prevAttempt;

  const handleSelect = async (submission?: string) => {
    if (isLoading) return;
    if (!isPremiumUser) {
      showUpgradePlanModal();
      return;
    }
    toast.dismiss();
    try {
      // if previous attempt exists, check if 72 hours has passed since it's creation
      if (prevAttempt) {
        const lastAttempt = new Date(prevAttempt.created);
        const now = new Date();
        const diff = differenceInHours(now, lastAttempt);
        if (diff >= 72) {
          setAlert({
            title: "This Project is no longer available",
            message:
              "You have exceeded the 72 hours time frame for this case study project. Please select another project.",
            icon: "error",
          });
          return;
        }
      }
      setIsLoading(true);
      const attempt = await (prevAttempt
        ? submitCaseStudyProject(activeProject.id, prevAttempt.id, submission!)
        : attemptCaseStudyProject(activeProject.id, submission));
      setAttemptedProject(prev => [
        ...prev.filter(a => a.project !== activeProject.title),
        attempt,
      ]);
      setAlert({
        title: "Success",
        message: hasAttemptedCurrentProject
          ? "Assessment submitted successfully!"
          : "You have selected a case study project and your submission would be expected within 3days! Good luck.",
        icon: "success",
      });
    } catch (error) {
      handleFormSubmissionError(error, undefined, setAlert);
    } finally {
      setIsLoading(false);
      modalRef.current?.close();
    }
  };
  const closeModal = () => modalRef.current?.close();
  const next = () => nextStep(maxStepIndex);
  const prev = () => prevStep();

  useEffect(() => {
    if (defaultProject) {
      const attempt = attempts.find(a => a.id === defaultProject);
      const index = projects.findIndex(p => p.id === attempt?.project);
      if (index !== -1) {
        setStep(index);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultProject]);

  if (!projects.length)
    return (
      <div className='flex flex-col items-center justify-center py-6'>
        <EmptyState text='There are no available case study projects at the moment. Please check back later.' />
      </div>
    );

  return (
    <>
      <div className='flex flex-col-reverse sm:flex-col gap-6 sm:gap-8'>
        <ClockDisplay>72 Hours</ClockDisplay>
        <div className='flex max-sm:flex-col-reverse gap-5'>
          <progress
            className='progress progress-primary w-full'
            value={((activeStepIndex + 1) / (maxStepIndex + 1)) * 100}
            max={100}
          />
          <h5 className='text-gray-900 sm:text-[#000000C9] font-semibold sm:font-medium text-lg sm:text-sm flex max-sm:flex-row-reverse max-sm:justify-end'>
            <span className='mr-1'>
              {activeStepIndex + 1}/{projects.length}
            </span>
            Case<span className='max-sm:hidden ml-1'>Study</span>
          </h5>
        </div>
      </div>
      <div className='sm:border px-5 sm:px-10 sm:py-[74px] w-full'>
        <article>
          <h2 className='font-bold mb-3 text-2xl -tracking-[0.5px]'>
            {activeProject?.title}
          </h2>
          <div
            dangerouslySetInnerHTML={{
              __html: activeProject?.about,
            }}
          />
        </article>
        <div className='divider my-6 sm:mt-10 sm:mb-8' />
        <div className='flex justify-end gap-3 flex-wrap'>
          <button
            className={cn(
              "btn btn-outline border-gray-300 text-base text-gray-700 font-medium max-sm:flex-1",
              !activeStepIndex && "hidden"
            )}
            onClick={prev}
          >
            Previous<span className='max-md:hidden'> Case Study</span> Project
          </button>
          <button
            className={cn(
              "btn btn-outline border-gray-300 text-base text-gray-700 font-medium max-sm:flex-1",
              isAtLastStep && "hidden"
            )}
            onClick={next}
          >
            Next<span className='max-md:hidden'> Case Study</span> Project
          </button>
          {hasAttemptedCurrentProject ? (
            <button
              className='btn btn-primary text-base font-medium max-sm:flex-1'
              onClick={() => modalRef.current?.showModal()}
            >
              Submit<span className='max-md:hidden'> Case Study</span>
            </button>
          ) : (
            <button
              className='btn btn-primary text-base font-medium max-sm:flex-1'
              onClick={() => modalRef.current?.showModal()}
            >
              Continue<span className='max-md:hidden'> with Case Study</span>
            </button>
          )}
        </div>
      </div>
      <Modal
        id='confirm-csp-modal'
        modalRef={modalRef}
        disableClose={isLoading}
        scrollAreaClassName='h-fit sm:h-fit'
      >
        <div>
          <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold'>
            {hasAttemptedCurrentProject
              ? "Submit Assessment"
              : "Confirm Case Study Project"}
          </h3>
          <p className='text-[#999999]'>
            Please check to see if all information details are correct to avoid
            wrong processing
          </p>
          <hr className='bg-[#E6E6E6] mt-5 mb-8' />

          {hasAttemptedCurrentProject ? (
            <Formik
              initialValues={{ submission: "" }}
              validationSchema={yup.object().shape({
                submission: yup
                  .string()
                  .url()
                  .required()
                  .label("Assessment link"),
              })}
              onSubmit={({ submission }) => handleSelect(submission)}
            >
              {({ handleSubmit, errors, values }) => (
                <form onSubmit={handleSubmit}>
                  <div className='form-control'>
                    <label htmlFor='submission' className='label'>
                      Submission
                    </label>
                    <FormikField
                      name='submission'
                      type='url'
                      value={values.submission}
                      error={errors.submission}
                      label='Link to Assessment'
                    />
                  </div>
                  <Button
                    className='btn btn-primary w-full mt-10'
                    type='submit'
                    loading={isLoading}
                  >
                    Submit{isLoading ? "ting..." : " Case Study"}
                  </Button>
                </form>
              )}
            </Formik>
          ) : (
            <>
              <div className='flex items-center justify-between bg-[#D9DDFF] rounded-t-lg p-6'>
                <h4 className='text-base font-medium'>Project selected</h4>
                <button onClick={closeModal}>
                  <BiSolidPencil className='text-2xl text-primary' />
                </button>
              </div>
              <div className='p-6 rounded-b-lg border-[#FAFAFA] border-2 border-t-0'>
                <div className='px-6 py-5  rounded-lg border-[#EAECF0] border-2 text-base'>
                  <h2 className='font-bold'>{activeProject?.title}</h2>
                  <p className='line-clamp-3'>
                    {htmlToPlainText(activeProject?.about)}
                  </p>
                </div>
              </div>
              <Button
                className='btn btn-primary w-full mt-10'
                onClick={() => handleSelect()}
                loading={isLoading}
                disabled={!activeProject}
              >
                Confirm{isLoading ? "ing..." : " Case Study"}
              </Button>
            </>
          )}
        </div>
      </Modal>
    </>
  );
};

export default SelectCSP;
