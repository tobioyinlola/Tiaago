"use client";
import { Formik } from "formik";
import { Button } from "react-daisyui";
import { FiEdit } from "react-icons/fi";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast as sonnerToast } from "sonner";

import {
  initialValues,
  educationFormFields,
  educationFormValidationSchema,
} from "./form.constants";

import {
  createTalentPortfolioEducation,
  updateTalentPortfolioEducation,
} from "@/app/common/services/talents";
import { useAlert } from "@/app/common/store/useAlert";
import { TalentPortfolioEducation } from "@/app/common/types";
import { handleFormSubmissionError } from "@/app/common/utils";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import FormikField from "@/app/common/components/Forms/FormikField";
import { ButtonModal, ModalProps } from "@/app/common/components/Modal";

type TalentEducationModalFormProps = {
  refresh?: boolean;
  buttonClassName?: string;
  education?: TalentPortfolioEducation;
  modalRef?: ModalProps["modalRef"];
};

const TalentEducationModalForm = ({
  refresh = false,
  buttonClassName = "btn-primary",
  education,
  modalRef,
}: TalentEducationModalFormProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const __modalRef = useRef<HTMLDialogElement>(null);
  const _modalRef = modalRef ?? __modalRef;
  const [setEducations, educations] = useTalentStore(s => [
    s.setEducations,
    s.portfolio?.education || [],
  ]);
  const setAlert = useAlert(state => state.setAlert);

  return (
    <ButtonModal
      buttonText={education ? undefined : "Add"}
      icon={
        !education ? undefined : <FiEdit className='text-xl text-[#7F7F7F]' />
      }
      id={
        education
          ? `edit-education-${education.school}-modal`
          : "create-education-modal"
      }
      buttonClassName={buttonClassName}
      modalRef={_modalRef}
      disableClose={loading}
      disablePadding
      className='w-full'
    >
      <div className='border-b p-6'>
        <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
          {education ? `Edit Education` : "Create Education"}
        </h3>
        <p className='text-[#999] text-sm -tracking-[0.1px]'>
          Kindly {education ? `edit` : "fill in"} the details for the Academic
          Qualification
        </p>
      </div>
      <Formik
        initialValues={{
          ...initialValues,
          ...(education && {
            school: education.school,
            program: education.program,
            degree: education.degree,
            start_date: education.start_date,
            end_date: education.end_date,
          }),
        }}
        onSubmit={(input, { setFieldError, resetForm }) => {
          setLoading(true);
          const modal = _modalRef.current;
          if (education) {
            updateTalentPortfolioEducation(education.id, input)
              .then(res => {
                if (!res.success) throw Error(res.error);
                sonnerToast.success("Education updated successfully");
                if (!education) resetForm();
                if (res.data)
                  setEducations(
                    educations.map(e => (e.id === education.id ? res.data : e))
                  );

                modal?.close();
                if (refresh) router.refresh();
              })
              .catch(err =>
                handleFormSubmissionError(err, setFieldError, setAlert)
              )
              .finally(() => setLoading(false));
          } else {
            createTalentPortfolioEducation(input)
              .then(res => {
                if (!res.success) throw Error(res.error);
                sonnerToast.success("Education created successfully");
                if (!education) resetForm();
                if (res.data) setEducations([...educations, res.data]);

                modal?.close();
                if (refresh) router.refresh();
              })
              .catch(err =>
                handleFormSubmissionError(err, setFieldError, setAlert)
              )
              .finally(() => setLoading(false));
          }
        }}
        validationSchema={educationFormValidationSchema}
      >
        {({ handleSubmit, errors, touched, values }) => (
          <form onSubmit={handleSubmit} className='my-5 p-6'>
            <div className='flex-wrap md:flex justify-between items-end'>
              {educationFormFields.map(({ name, ...props }) => {
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
              {loading ? "Submitting..." : education ? "Update" : "Create"}
            </Button>
          </form>
        )}
      </Formik>
    </ButtonModal>
  );
};

export default TalentEducationModalForm;
