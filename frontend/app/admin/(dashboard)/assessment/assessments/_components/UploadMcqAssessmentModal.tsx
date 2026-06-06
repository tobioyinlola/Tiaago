"use client";

import { toast } from "sonner";
import { Formik } from "formik";
import { Button } from "react-daisyui";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  uploadMcqAssessmentFormValidationSchema,
  uploadMcqAssessmentFormFields,
  uploadMcqAssessmentFormInitialValues,
} from "./uploadMcqAssessmentForm.constants";
import { useAlert } from "@/app/common/store/useAlert";
import { ButtonModal } from "@/app/common/components/Modal";
import { handleFormSubmissionError } from "@/app/common/utils";
import { TalentRole } from "@/app/common/types";
import FormikField from "@/app/common/components/Forms/FormikField";
import { uploadMcqAssessment } from "@/app/common/services/assessment";

const UploadMcqAssessmentModal = ({
  talentRoles,
}: {
  talentRoles: TalentRole[];
}) => {
  const _modalRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const setAlert = useAlert(state => state.setAlert);
  const router = useRouter();
  return (
    <ButtonModal
      buttonText='Upload MCQ Assessment'
      id='upload-mcq-assessment'
      buttonClassName='btn-primary'
      modalRef={_modalRef}
      disableClose={loading}
      disablePadding
      className='w-full'
    >
      <div className='border-b p-6'>
        <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
          Upload MCQ Assessment
        </h3>
        <p className='text-[#999] text-sm -tracking-[0.1px]'>
          Kindly upload the MCQ Assessment
        </p>
      </div>
      <Formik
        initialValues={uploadMcqAssessmentFormInitialValues}
        onSubmit={(_, { setFieldError }) => {
          if (loading || !formRef.current) return;
          setLoading(true);
          const modal = _modalRef.current;
          const formData = new FormData(formRef.current);
          if (!formData.get("stack")) {
            formData.delete("stack");
          }
          uploadMcqAssessment(formData)
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
        validationSchema={uploadMcqAssessmentFormValidationSchema}
      >
        {({ handleSubmit, errors, touched, values }) => (
          <form onSubmit={handleSubmit} className='my-5 p-6' ref={formRef}>
            {uploadMcqAssessmentFormFields.map((props, i) => {
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
                      options: talentRoles.map(({ title, slug }) => ({
                        label: title,
                        value: slug,
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

export default UploadMcqAssessmentModal;
