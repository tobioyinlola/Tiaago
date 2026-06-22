"use client";

import { toast } from "sonner";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";
import { BsPlus } from "react-icons/bs";
import { useRouter } from "next/navigation";

import {
  questionTypes,
  initialValues,
  booleanFields,
  validationSchema,
  assessmentBasicDetailsFormFields,
} from "../../constants/assessment-form.constants";
import { TalentRole } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";

const AddAssessmentForm = ({
  questionType = "",
  talentRoles,
}: {
  talentRoles: TalentRole[];
  questionType?: string;
}) => {
  const router = useRouter();
  const setAlert = useAlert(s => s.setAlert);
  const defaultQuestionType = questionTypes.includes(questionType.toUpperCase())
    ? questionType.toUpperCase()
    : "";

  return (
    <Formik
      onSubmit={(values, { setSubmitting, resetForm, setFieldError }) => {
        new Promise(async (resolve, reject) => {
          toast.dismiss();
          try {
            // const data = await createCompanyAssessment(values);
            const data = await clientKyInstance
              .post("skill-assessments/company-assessments", {
                json: values,
              })
              .json();
            resolve(data);
          } catch (err) {
            reject(err);
          }
        })
          .then(() => {
            setSubmitting(false);
            resetForm();
            toast.success("Assessment created successfully");
            router.push("/startups/dashboard/assessments");
          })
          .catch(err => {
            setSubmitting(false);
            console.log(err);
            handleFormSubmissionError(err, setFieldError, setAlert);
          });
      }}
      initialValues={{
        ...initialValues,
        assessment_type: questionTypes.includes(questionType.toUpperCase())
          ? questionType.toUpperCase()
          : "",
      }}
      validationSchema={validationSchema}
    >
      {({
        handleSubmit,
        errors,
        touched,
        isSubmitting,
        values,
        handleChange,
      }) => (
        <form
          onSubmit={handleSubmit}
          className='space-y-8 bg-white p-8 pb-10 rounded-lg shadow-sm border border-[#EAECF0]'
        >
          {/* Basic Details Section */}
          <div className=''>
            <h2 className='text-base font-bold text-primaryBlack'>
              Basic Details
            </h2>
            <hr className='mt-3 mb-5 bg-[#EAECF0]' />
            <div className='flex items-center ml-auto justify-end'>
              <BsPlus />
              <p>Add option</p>
            </div>

            <div className='flex-wrap md:flex justify-between'>
              {assessmentBasicDetailsFormFields.map(({ name, ...props }) => {
                const value = values[name];
                const err = errors[name];
                const error = typeof err === "string" ? err : err?.at(0);
                return (
                  <FormikField
                    key={name}
                    {...{ name, value, ...props }}
                    error={error}
                    touched={touched[name]}
                    {...(props.type === "select" && {
                      selectFieldProps: {
                        options:
                          name === "skillsets"
                            ? talentRoles.map(role => ({
                                label: role.title,
                                value: role.id,
                              }))
                            : undefined,
                        defaultValue:
                          name === "assessment_type" && defaultQuestionType
                            ? props.selectFieldProps?.options?.find(
                                option => option.value === defaultQuestionType
                              )
                            : undefined,
                        ...props.selectFieldProps,
                      },
                    })}
                  />
                );
              })}
            </div>
          </div>

          {/* Assessment Section */}
          <div className='bg-white p-6 rounded-lg shadow-sm'>
            <h2 className='text-base font-bold text-primaryBlack'>
              Assessment
            </h2>
            <hr className='mt-3 mb-5 bg-[#EAECF0]' />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
              <FormikField
                name='duration_minutes'
                label='Duration (minutes)'
                value={values.duration_minutes}
                type='number'
                error={errors.duration_minutes}
                touched={touched.duration_minutes}
              />

              <FormikField
                name='passing_grade'
                label='Passing Grade (%)'
                value={values.passing_grade}
                type='number'
                error={errors.passing_grade}
                touched={touched.passing_grade}
              />

              {booleanFields.map(field => (
                <label
                  key={field.name}
                  className='flex justify-start items-start gap-x-3'
                >
                  <input
                    type='checkbox'
                    name={field.name}
                    checked={values[field.name] as boolean}
                    onChange={handleChange}
                    className='radio radio-primary radio-xs'
                  />
                  <div className='space-y-2'>
                    <p className='text-sm text-[#343A40]'>{field.label}</p>
                    <p className='text-xs text-[#6C757D]'>
                      {field.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className='flex justify-end mt-12'>
            <Button
              type='submit'
              className='btn btn-primary text-sm font-medium'
              loading={isSubmitting}
            >
              Add Assessment
            </Button>
          </div>
        </form>
      )}
    </Formik>
  );
};

export default AddAssessmentForm;
