"use client";

import { toast } from "sonner";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";

import {
  resetPasswordFormFields,
  resetPasswordInitialValues,
  resetPasswordValidationSchema,
} from "./form.constants";
import { useAlert } from "@/app/common/store/useAlert";
import axiosInstance from "@/app/common/utils/axios.instance";
import {
  getOnboardingUrl,
  handleFormSubmissionError,
} from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import { BasePageProps } from "@/app/common/types";

type ResetPasswordFormProps = {
  uid: string;
  token: string;
  as: BasePageProps["as"];
};

const ResetPasswordForm = ({ token, uid, as }: ResetPasswordFormProps) => {
  const setAlert = useAlert(state => state.setAlert);
  return (
    <Formik
      initialValues={resetPasswordInitialValues}
      onSubmit={(input, { setSubmitting, resetForm, setFieldError }) => {
        new Promise(async (resolve, reject) => {
          try {
            const { data } = await axiosInstance.post(
              `/auth/password/reset/confirm/${uid}/${token}/`,
              {
                new_password1: input.password1,
                new_password2: input.password2,
              }
            );
            resolve(data);
          } catch (err) {
            reject(err);
          }
        })
          .then(() => {
            toast.dismiss();
            setSubmitting(false);
            resetForm();
            setAlert({
              message: "Password reset successfully. You can now login.",
              icon: "success",
              title: "Success",
              buttonLink: getOnboardingUrl(as),
              buttonText: "Login",
            });
          })
          .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
          .finally(() => setSubmitting(false));
      }}
      validationSchema={resetPasswordValidationSchema}
    >
      {({ handleSubmit, isSubmitting, errors, touched, values }) => (
        <form onSubmit={handleSubmit} className='my-8'>
          {resetPasswordFormFields.map(({ name, type, label }) => (
            <FormikField
              key={name}
              {...{ name, label, type }}
              value={values[name]}
              error={errors[name]}
              touched={touched[name]}
            />
          ))}
          <Button
            loading={isSubmitting}
            color='primary'
            className='text-white w-full'
            type='submit'
          >
            Set Password
          </Button>
        </form>
      )}
    </Formik>
  );
};

export default ResetPasswordForm;
