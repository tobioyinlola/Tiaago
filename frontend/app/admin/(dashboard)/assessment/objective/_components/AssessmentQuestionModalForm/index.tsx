"use client";
import { Formik } from "formik";
import { Button } from "react-daisyui";
import { FiEdit } from "react-icons/fi";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast as sonnerToast } from "sonner";

import {
  assessmentQuestionFormValidationSchema,
  initialValues,
} from "./form.contants";
import {
  AssessmentQuestionInput,
  createAssessmentQuestion,
  updateAssessmentQuestion,
} from "@/app/common/services/assessment";
import { useAlert } from "@/app/common/store/useAlert";
import { AssessmentQuestion } from "@/app/common/types";
import { ButtonModal } from "@/app/common/components/Modal";
import { handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";

type AssessmentQuestionModalFormProps = {
  refresh?: boolean;
  buttonClassName?: string;
  quiz_slug: string;
  question?: AssessmentQuestion;
};

const AssessmentQuestionModalForm = ({
  refresh = false,
  buttonClassName = "btn-primary btn-outline",
  question,
  quiz_slug,
}: AssessmentQuestionModalFormProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const setAlert = useAlert(state => state.setAlert);
  const _modalRef = useRef<HTMLDialogElement>(null);

  return (
    <ButtonModal
      buttonText={question ? undefined : "Add Question"}
      icon={
        !question ? undefined : <FiEdit className='text-xl text-[#7F7F7F]' />
      }
      id={
        question
          ? `edit-question-${question.id}-modal`
          : "create-question-modal"
      }
      buttonClassName={buttonClassName}
      modalRef={_modalRef}
      disableClose={loading}
      disablePadding
      className='w-full'
    >
      <div className='border-b p-6'>
        <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
          {question ? `Edit Question` : "Create Question"}
        </h3>
        <p className='text-[#999] text-sm -tracking-[0.1px]'>
          Kindly {question ? `edit` : "fill in"} the details for the Assesment
          Question
        </p>
      </div>
      <Formik
        initialValues={{
          ...initialValues,
          ...(question && {
            label: question.label,
            option_1: Object.values(question.options)[0] ?? "",
            option_2: Object.values(question.options)[1] ?? "",
            option_3: Object.values(question.options)[2] ?? "",
            option_4: Object.values(question.options)[3] ?? "",
          }),
        }}
        onSubmit={(values, { setFieldError, resetForm }) => {
          setLoading(true);
          const modal = _modalRef.current;
          const inputValues = values as AssessmentQuestionInput;
          (question
            ? updateAssessmentQuestion(quiz_slug, question.id, inputValues)
            : createAssessmentQuestion(quiz_slug, inputValues)
          )
            .then(() => {
              sonnerToast.success(
                `Question ${question ? "updated" : "created"} successfully`
              );
              if (!question) resetForm();
              modal?.close();
              if (refresh) router.refresh();
            })
            .catch(err =>
              handleFormSubmissionError(err, setFieldError, setAlert)
            )
            .finally(() => setLoading(false));
        }}
        validationSchema={assessmentQuestionFormValidationSchema}
      >
        {({ handleSubmit, errors, touched, values, setFieldValue }) => (
          <form onSubmit={handleSubmit} className='my-5 p-6'>
            <FormikField
              name='label'
              label='Question'
              placeholder='What is the capital of Nigeria?'
              error={errors.label}
              touched={touched.label}
              value={values.label}
            />
            {Array.from({ length: 4 }).map((_, i) => {
              const option = `option_${
                i + 1
              }` as AssessmentQuestionInput["is_correct"];
              return (
                <div key={i} className='flex items-center space-x-2'>
                  <input
                    name='is_correct'
                    type='radio'
                    className='radio'
                    checked={values.is_correct === option}
                    onChange={() => setFieldValue("is_correct", option)}
                  />
                  <FormikField
                    name={option}
                    label={`Option ${i + 1}`}
                    placeholder={`Option ${i + 1}`}
                    error={errors[option]}
                    touched={touched[option]}
                    value={values[option]}
                  />
                </div>
              );
            })}
            {/* is_correct error display */}
            {errors.is_correct && touched.is_correct && (
              <p className='text-red-500 text-xs text-center'>
                Please select the correct option
              </p>
            )}
            <Button
              loading={loading}
              color='primary'
              className='text-white w-full my-5'
              type='submit'
            >
              {loading ? "Submitting..." : question ? "Update" : "Create"}
            </Button>
          </form>
        )}
      </Formik>
    </ButtonModal>
  );
};

export default AssessmentQuestionModalForm;
