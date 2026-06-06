"use client";
import * as yup from "yup";
import { toast } from "sonner";
import { Formik } from "formik";
import { Button } from "react-daisyui";
import { BiSolidEnvelope } from "react-icons/bi";

import { cn, handleFormSubmissionError } from "@/app/common/utils";
import { sendReferralInvite } from "@/app/common/services/profile";
import FormikField from "@/app/common/components/Forms/FormikField";
import { emailValidationSchema } from "@/app/common/constants/validationSchemas";

const SendReferralInvite = () => {
  const validationSchema = yup.object({
    email: emailValidationSchema,
  });

  return (
    <Formik
      initialValues={{ email: "" }}
      validationSchema={validationSchema}
      onSubmit={(values, { setFieldError, resetForm, setSubmitting }) => {
        sendReferralInvite(values.email)
          .then(() => {
            toast.success("Invite sent successfully");
            resetForm();
          })
          .catch(error => {
            handleFormSubmissionError(error, setFieldError);
          })
          .finally(() => {
            setSubmitting(false);
          });
      }}
    >
      {({ handleSubmit, values, errors, touched, isSubmitting }) => (
        <form onSubmit={handleSubmit} className='flex items-start flex-wrap md:grid grid-cols-4 gap-3'>
          <h3 className='text-[#344054] font-medium text-base max-md:w-full'>
            Email Invites
          </h3>

          {/* <div className='input w-full col-span-2 border border-[#BDC3C7] text-[#BDC3C7] flex items-center gap-2 max-md:col-span-2'> */}
          <FormikField
            name='email'
            type='email'
            placeholder='scottowens@gmail.com'
            className='flex-1 col-span-2'
            label=''
            error={errors.email}
            touched={touched.email}
            value={values.email}
            leftIcon={<BiSolidEnvelope className='text-base text-[#98A2B3]' />}
          />

          <Button
            type='submit'
            className='btn btn-primary btn-sm w-[42px] h-[42px] ml-auto'
            loading={isSubmitting}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='22'
              height='22'
              viewBox='0 0 22 22'
              fill='none'
              className={cn(isSubmitting && "hidden")}
            >
              <path
                d='M20.2469 2.05293C18.0689 -0.292637 1.6857 5.4532 1.69923 7.551C1.71456 9.92987 8.09731 10.6617 9.86644 11.1581C10.9303 11.4565 11.2152 11.7625 11.4606 12.8781C12.5715 17.9305 13.1293 20.4435 14.4006 20.4996C16.427 20.5892 22.3726 4.342 20.2469 2.05293Z'
                stroke='white'
                strokeWidth='1.5'
              />
              <path
                d='M10.6992 11.5L14.1992 8'
                stroke='white'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </Button>
        </form>
      )}
    </Formik>
  );
};

export default SendReferralInvite;
