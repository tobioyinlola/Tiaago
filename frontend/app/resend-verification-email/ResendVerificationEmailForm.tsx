"use client";

import { object } from "yup";
import { toast } from "sonner";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";

import { useAlert } from "@/app/common/store/useAlert";
import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import { emailValidationSchema } from "@/app/common/constants/validationSchemas";

const resendVerificationEmailFormValidationSchema = object().shape({
  email: emailValidationSchema,
});

const ResendVerificationEmailForm = () => {
  const setAlert = useAlert(state => state.setAlert);
  return (
    <Formik
      initialValues={{
        email: "",
      }}
      onSubmit={(values, { setSubmitting, resetForm, setFieldError }) => {
        new Promise(async (resolve, reject) => {
          try {
            const data = await clientKyInstance
              .post("auth/resend-email/", { json: values })
              .json();
            resolve(data);
          } catch (err) {
            reject(err);
          }
        })
          .then(() => {
            toast.dismiss();
            resetForm();
            setAlert({
              message:
                "An email was sent with instructions to verify your account.",
              icon: "success",
              title: "Success",
            });
          })
          .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
          .finally(() => setSubmitting(false));
      }}
      validationSchema={resendVerificationEmailFormValidationSchema}
    >
      {({ handleSubmit, isSubmitting, errors, touched, values }) => (
        <form onSubmit={handleSubmit} className='my-8'>
          <FormikField
            name='email'
            label='Email address'
            touched={touched.email}
            error={errors.email}
            type='email'
            value={values.email}
          />
          <Button
            loading={isSubmitting}
            color='primary'
            className='text-white w-full'
            type='submit'
          >
            Continue
          </Button>
        </form>
      )}
    </Formik>
  );
};

export default ResendVerificationEmailForm;
