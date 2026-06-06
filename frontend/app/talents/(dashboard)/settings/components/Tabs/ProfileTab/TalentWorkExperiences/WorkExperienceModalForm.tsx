"use client";
import { Formik } from "formik";
import { Button } from "react-daisyui";
import { FiEdit } from "react-icons/fi";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast as sonnerToast } from "sonner";

import {
  initialValues,
  workExperienceFormFields,
  workExperienceFormValidationSchema,
} from "./form.constants";

import {
  createPortfolioExperience,
  updatePortfolioExperience,
} from "@/app/common/services/talents";
import { useAlert } from "@/app/common/store/useAlert";
import { handleFormSubmissionError } from "@/app/common/utils";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import { TalentPortfolioWorkExperience } from "@/app/common/types";
import FormikField from "@/app/common/components/Forms/FormikField";
import { ButtonModal, ModalProps } from "@/app/common/components/Modal";

type WorkExperienceModalFormProps = {
  refresh?: boolean;
  buttonClassName?: string;
  experience?: TalentPortfolioWorkExperience;
  modalRef?: ModalProps["modalRef"];
};

const WorkExperienceModalForm = ({
  refresh = false,
  buttonClassName = "btn-primary",
  experience,
  modalRef,
}: WorkExperienceModalFormProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const __modalRef = useRef<HTMLDialogElement>(null);
  const _modalRef = modalRef ?? __modalRef;
  const [setExperiences, experiences] = useTalentStore(s => [
    s.setExperiences,
    s.portfolio?.experience ?? [],
  ]);
  const setAlert = useAlert(state => state.setAlert);

  return (
    <ButtonModal
      buttonText={experience ? undefined : "Add"}
      icon={
        !experience ? undefined : <FiEdit className='text-xl text-[#7F7F7F]' />
      }
      id={
        experience
          ? `edit-experience-${experience.company_name}-modal`
          : "create-experience-modal"
      }
      buttonClassName={buttonClassName}
      modalRef={_modalRef}
      disableClose={loading}
      disablePadding
      className='w-full'
    >
      <div className='border-b p-6'>
        <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
          {experience ? `Edit Experience` : "Create Experience"}
        </h3>
        <p className='text-[#999] text-sm -tracking-[0.1px]'>
          Kindly {experience ? `edit` : "fill in"} the details for the Work
          Experience
        </p>
      </div>
      <Formik
        initialValues={{
          ...initialValues,
          ...(experience && {
            company_name: experience.company_name,
            title: experience.title,
            start_date: experience.start_date,
            end_date: experience.end_date ?? "",
            company_logo_url: experience.company_logo_url ?? "",
            employment_type: experience.employment_type,
          }),
        }}
        onSubmit={(values, { setFieldError, resetForm }) => {
          setLoading(true);
          const modal = _modalRef.current;
          const input = {
            company_name: values.company_name,
            title: values.title,
            start_date: values.start_date,
            ...(values.end_date ? { end_date: values.end_date } : {}),
            ...(values.company_logo_url
              ? { company_logo_url: values.company_logo_url }
              : {}),
            employment_type: values.employment_type,
          };
          if (experience) {
            updatePortfolioExperience(experience.id, input)
              .then(res => {
                if (!res.success) throw Error(res.error);
                sonnerToast.success("Experience updated successfully");
                if (!experience) resetForm();
                if (res.data)
                  setExperiences(
                    experiences.map(e => (e.id === experience.id ? res.data : e))
                  );

                modal?.close();
                if (refresh) router.refresh();
              })
              .catch(err =>
                handleFormSubmissionError(err, setFieldError, setAlert)
              )
              .finally(() => setLoading(false));
          } else {
            createPortfolioExperience(input)
              .then(res => {
                if (!res.success) throw Error(res.error);
                sonnerToast.success("Experience created successfully");
                if (!experience) resetForm();
                if (res.data) setExperiences([...experiences, res.data]);

                modal?.close();
                if (refresh) router.refresh();
              })
              .catch(err =>
                handleFormSubmissionError(err, setFieldError, setAlert)
              )
              .finally(() => setLoading(false));
          }
        }}
        validationSchema={workExperienceFormValidationSchema}
      >
        {({ handleSubmit, errors, touched, values, setFieldValue }) => (
          <form onSubmit={handleSubmit} className='my-5 p-6'>
            <div className='flex-wrap md:flex justify-between'>
              {workExperienceFormFields.map(({ name, ...props }) => {
                return (
                  <FormikField
                    key={name}
                    name={name}
                    value={values[name]}
                    error={errors[name]}
                    touched={touched[name]}
                    {...props}
                  />
                );
              })}
            </div>
            <Button
              loading={loading}
              color='primary'
              className='text-white w-full my-5'
              type='submit'
            >
              {loading ? "Submitting..." : experience ? "Update" : "Create"}
            </Button>
          </form>
        )}
      </Formik>
    </ButtonModal>
  );
};

export default WorkExperienceModalForm;
