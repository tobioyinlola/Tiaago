"use client";

import { toast } from "sonner";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createCodeAssessmentFormValidationSchema,
  createCodeAssessmentFormFields,
} from "./createCodeAssessmentForm.constants";
import { useAlert } from "@/app/common/store/useAlert";
import { ButtonModal } from "@/app/common/components/Modal";
import { handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import { createCodeAssessment } from "@/app/common/services/assessment";
import { AssessmentStack, CompanySkillAssessment } from "@/app/common/types";

const CreateCodeAssessmentModal = ({
  assessmentStacks,
  assessment,
}: {
  assessmentStacks: AssessmentStack[];
  assessment: CompanySkillAssessment;
}) => {
  const _modalRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const setAlert = useAlert(state => state.setAlert);
  const router = useRouter();
  return (
    <ButtonModal
      buttonText='Create Code Assessment'
      id='create-code-assessment'
      buttonClassName='text-primary cursor-pointer hover:underline'
      modalRef={_modalRef}
      disableClose={loading}
      unStyled
      disablePadding
      className='w-full'
    >
      <div className='border-b p-6'>
        <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
          Create Code Assessment
        </h3>
        <p className='text-[#999] text-sm -tracking-[0.1px]'>
          Kindly create the code assessment
        </p>
      </div>
      <Formik
        initialValues={{
          name: assessment.title || "",
          description: assessment.description || "",
          duration_minutes: assessment.duration_minutes || 0,
          stack: 0,
        }}
        onSubmit={(values, { setFieldError }) => {
          if (loading) return;
          const modal = _modalRef.current;
          const mcq_section_id = assessment.sections.find(
            section => section.type === "MCQ"
          )?.id;
          if (!mcq_section_id) {
            toast.error("MCQ ID not found");
            modal?.close();
            return;
          }
          setLoading(true);
          createCodeAssessment({
            mcq_section_id,
            stack: values.stack,
            difficulty_level: assessment.difficulty_level,
            name: values.name,
            description: values.description,
            duration_minutes: values.duration_minutes,
          })
            .then(res => {
              if (res.success) {
                toast.success("Assessment created successfully");
                modal?.close();
                router.refresh();
              } else {
                handleFormSubmissionError(res.error, setFieldError, setAlert);
              }
            })
            .catch(err =>
              handleFormSubmissionError(err, setFieldError, setAlert)
            )
            .finally(() => setLoading(false));
        }}
        validationSchema={createCodeAssessmentFormValidationSchema}
      >
        {({ handleSubmit, errors, touched, values }) => (
          <form onSubmit={handleSubmit} className='my-5 p-6'>
            {createCodeAssessmentFormFields.map((props, i) => {
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
                      options: assessmentStacks.map(({ stack, id }) => ({
                        label: stack,
                        value: id,
                      })),
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
              {loading ? "Submitting..." : "Create"}
            </Button>
          </form>
        )}
      </Formik>
    </ButtonModal>
  );
};

export default CreateCodeAssessmentModal;
