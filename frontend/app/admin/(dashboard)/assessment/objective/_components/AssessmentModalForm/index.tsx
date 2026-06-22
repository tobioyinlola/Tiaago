"use client";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";
import { FiEdit } from "react-icons/fi";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast as sonnerToast } from "sonner";

import {
  assessmentFormValidationSchema,
  initialValues,
  assessmentFormFields,
} from "./form.contants";
import {
  createAssessment,
  updateAssessment,
} from "@/app/common/services/assessment";
import { useAlert } from "@/app/common/store/useAlert";
import { ButtonModal } from "@/app/common/components/Modal";
import { handleFormSubmissionError } from "@/app/common/utils";
import { SkillAssessmentQuiz, TalentRole } from "@/app/common/types";
import FormikField from "@/app/common/components/Forms/FormikField";

type CreateAssessmentProps = {
  refresh?: boolean;
  buttonClassName?: string;
  roles: TalentRole[];
  assessment?: SkillAssessmentQuiz;
};

const AssessmentModalForm = ({
  refresh = false,
  buttonClassName = "btn-primary",
  roles,
  assessment,
}: CreateAssessmentProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const setAlert = useAlert(state => state.setAlert);
  const _modalRef = useRef<HTMLDialogElement>(null);

  return (
    <ButtonModal
      buttonText={assessment ? undefined : "Create Objective"}
      icon={
        !assessment ? undefined : <FiEdit className='text-xl text-[#7F7F7F]' />
      }
      id={
        assessment ? `edit-assessment-${assessment.slug}` : "create-assessment"
      }
      buttonClassName={buttonClassName}
      modalRef={_modalRef}
      disableClose={loading}
      disablePadding
      className='w-full'
    >
      <div className='border-b p-6'>
        <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
          {assessment
            ? `Edit Assessment: ${assessment.name}`
            : "Create Assessment Quiz"}
        </h3>
        <p className='text-[#999] text-sm -tracking-[0.1px]'>
          Kindly {assessment ? `edit` : "fill in"} the details for the Assesment
          Quiz
        </p>
      </div>
      <Formik
        initialValues={{
          ...initialValues,
          ...(assessment && {
            name: assessment.name,
            questions_on: assessment.questions_on,
            roles: assessment.roles,
            description: assessment.description,
            minutes: assessment.minutes,
            question_count: assessment.question_count,
          }),
        }}
        onSubmit={(values, { setFieldError }) => {
          setLoading(true);
          const modal = _modalRef.current;
          (assessment
            ? updateAssessment(assessment.slug, values)
            : createAssessment(values)
          )
            .then(() => {
              sonnerToast.success(
                `Assessment ${assessment ? "updated" : "created"} successfully`
              );
              modal?.close();
              if (refresh) router.refresh();
            })
            .catch(err =>
              handleFormSubmissionError(err, setFieldError, setAlert)
            )
            .finally(() => setLoading(false));
        }}
        validationSchema={assessmentFormValidationSchema}
      >
        {({ handleSubmit, errors, touched, values }) => (
          <form onSubmit={handleSubmit} className='my-5 p-6'>
            {assessmentFormFields.map((props, i) => {
              const { name, type, label } = props;
              const _error = errors[name];
              const _touched = touched[name];
              const error = !_error
                ? undefined
                : typeof _error === "string"
                ? _error
                : String(_error?.[0]);
              const isTouched =
                typeof _touched === "boolean" ? _touched : false;
              return (
                <FormikField
                  key={name}
                  {...props}
                  {...{ name, label, type }}
                  value={values[name]}
                  error={error}
                  touched={isTouched}
                  {...(type === "select" && {
                    selectFieldProps: {
                      options: roles.map(({ title, id }) => ({
                        label: title,
                        value: name === "roles" ? id : title,
                      })),
                      defaultValue:
                        name === "questions_on"
                          ? values[name].map(title => ({
                              label: title,
                              value: title,
                            }))
                          : name === "roles"
                          ? roles
                              .filter(({ id }) => values[name].includes(id))
                              .map(({ title, id }) => ({
                                label: title,
                                value: id,
                              }))
                          : values[name],
                      ...props.selectFieldProps,
                    },
                  })}
                />
              );
            })}
            <Button
              loading={loading}
              color='primary'
              className='text-white w-full my-5'
              type='submit'
            >
              {loading ? "Submitting..." : assessment ? "Update" : "Create"}
            </Button>
          </form>
        )}
      </Formik>
    </ButtonModal>
  );
};

export default AssessmentModalForm;
