"use client";
import { Formik } from "formik";
import { Button } from "react-daisyui";
import { FiEdit } from "react-icons/fi";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast as sonnerToast } from "sonner";

import {
  caseStudyFormValidationSchema,
  initialValues,
  caseStudyFormFields,
} from "./form.contants";
import {
  createCaseStudyProject,
  updateCaseStudyProject,
} from "@/app/common/services/case-study";
import { useAlert } from "@/app/common/store/useAlert";
import { ButtonModal } from "@/app/common/components/Modal";
import { handleFormSubmissionError } from "@/app/common/utils";
import { CaseStudyProject, TalentRole } from "@/app/common/types";
import FormikField from "@/app/common/components/Forms/FormikField";

type CreateCaseStudyProps = {
  refresh?: boolean;
  buttonClassName?: string;
  roles: TalentRole[];
  caseStudy?: CaseStudyProject;
};

const CaseStudyModalForm = ({
  refresh = false,
  buttonClassName = "btn-primary",
  roles,
  caseStudy,
}: CreateCaseStudyProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const _modalRef = useRef<HTMLDialogElement>(null);
  const setAlert = useAlert(state => state.setAlert);

  return (
    <ButtonModal
      buttonText={caseStudy ? undefined : "Create Case Study"}
      icon={
        !caseStudy ? undefined : <FiEdit className='text-xl text-[#7F7F7F]' />
      }
      id={caseStudy ? `edit-case-study-${caseStudy.id}` : "create-case-study"}
      buttonClassName={buttonClassName}
      modalRef={_modalRef}
      disableClose={loading}
      disablePadding
      className='w-full'
    >
      <div className='border-b p-6'>
        <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
          {caseStudy
            ? `Edit Case Study Project: ${caseStudy.title}`
            : "Create Case Study Project"}
        </h3>
        <p className='text-[#999] text-sm -tracking-[0.1px]'>
          Kindly {caseStudy ? `edit` : "fill in"} the details for the Case Study
          Project
        </p>
      </div>
      <Formik
        initialValues={{
          ...initialValues,
          ...(caseStudy && {
            about: caseStudy.about,
            title: caseStudy.title,
            roles: caseStudy.roles,
          }),
        }}
        onSubmit={(values, { setFieldError }) => {
          setLoading(true);
          const modal = _modalRef.current;
          (caseStudy
            ? updateCaseStudyProject(caseStudy.id, values)
            : createCaseStudyProject(values)
          )
            .then(() => {
              sonnerToast.success(
                `Case Study Project ${
                  caseStudy ? "updated" : "created"
                } successfully`
              );
              modal?.close();
              if (refresh) router.refresh();
            })
            .catch(err =>
              handleFormSubmissionError(err, setFieldError, setAlert)
            )
            .finally(() => setLoading(false));
        }}
        validationSchema={caseStudyFormValidationSchema}
      >
        {({ handleSubmit, errors, touched, values }) => (
          <form onSubmit={handleSubmit} className='my-5 p-6'>
            {caseStudyFormFields.map((props, i) => {
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
                      options:
                        name === "roles"
                          ? roles.map(({ id, title }) => ({
                              label: title,
                              value: id,
                            }))
                          : undefined,
                      defaultValue:
                        name === "roles"
                          ? roles
                              .filter(({ id }) => values.roles.includes(id))
                              .map(({ id, title }) => ({
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
              {loading ? "Submitting..." : caseStudy ? "Update" : "Create"}
            </Button>
          </form>
        )}
      </Formik>
    </ButtonModal>
  );
};

export default CaseStudyModalForm;
