"use client";

import { object } from "yup";
import { toast } from "sonner";
import { Formik } from "formik";
import { Button, Form } from "react-daisyui";

import FormikField from "./FormikField";
import { useAlert } from "../../store/useAlert";
import axiosInstance from "../../utils/axios.instance";
import { handleFormSubmissionError } from "../../utils";
import { emailValidationSchema } from "@/app/common/constants/validationSchemas";

const forgotPasswordValidationSchema = object().shape({
  email: emailValidationSchema,
});

const ForgotPasswordForm = () => {
  const setAlert = useAlert(state => state.setAlert);
  return (
    <Formik
      initialValues={{
        email: "",
      }}
      onSubmit={(values, { setSubmitting, resetForm, setFieldError }) => {
        new Promise(async (resolve, reject) => {
          try {
            const { data } = await axiosInstance.post(
              "/auth/password/reset/",
              values
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
              message:
                "An email was sent with instructions to reset your password.",
              icon: "success",
              title: "Success",
            });
          })
          .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
          .finally(() => setSubmitting(false));
      }}
      validationSchema={forgotPasswordValidationSchema}
    >
      {({ handleSubmit, isSubmitting, errors, touched, values }) => (
        <Form onSubmit={handleSubmit} className='my-8'>
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
        </Form>
      )}
    </Formik>
  );
};

export default ForgotPasswordForm;
