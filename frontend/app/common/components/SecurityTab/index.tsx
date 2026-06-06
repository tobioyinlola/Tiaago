"use client";

import { toast } from "sonner";
import { Formik } from "formik";
import { Button, Form } from "react-daisyui";

import {
  changePasswordFields,
  changePasswordInitialValues,
  changePasswordSchema,
} from "./changePasswordForm";
import { useAlert } from "../../store/useAlert";
import axiosInstance from "../../utils/axios.instance";
import { handleFormSubmissionError } from "../../utils";
import FormikField from "@/app/common/components/Forms/FormikField";

const SecurityTab = () => {
  const setAlert = useAlert(state => state.setAlert);
  return (
    <div className='p-5 rounded-lg border border-gray-200'>
      <div className='border-b border-outline pb-5'>
        <h2 className='text-gray-900 text-base font-bold'>
          Password and Security
        </h2>
        <p className='text-sm text-gray-500'>
          Make changes to your password, you&apos;ll have to login again after
          the password is changed
        </p>
      </div>

      <Formik
        initialValues={changePasswordInitialValues}
        validationSchema={changePasswordSchema}
        onSubmit={(
          { currentPassword, ...values },
          { resetForm, setFieldError, setSubmitting }
        ) => {
          new Promise(async (resolve, reject) => {
            try {
              toast.dismiss();
              const { data } = await axiosInstance.post(
                "/auth/password/change/",
                values
              );
              resolve(data);
            } catch (err) {
              reject(err);
            }
          })
            .then(() => {
              setSubmitting(false);
              resetForm();
              toast.success("Password changed successfully");
            })
            .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
            .finally(() => setSubmitting(false));
        }}
      >
        {({ handleSubmit, isSubmitting, errors, touched, values }) => (
          <Form
            onSubmit={handleSubmit}
            className='my-8 max-w-md max-md:mx-auto'
          >
            {changePasswordFields.map(({ name, type, label }) => (
              <FormikField
                key={name}
                {...{ name, label, type }}
                value={values[name]}
                error={errors[name]}
                touched={touched[name]}
                disablePasswordHelpers={name !== "new_password1"}
              />
            ))}
            <Button
              loading={isSubmitting}
              variant='outline'
              size='sm'
              className='w-fit max-md:mx-auto border-gray-300 text-gray-700'
              type='submit'
            >
              Change password
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default SecurityTab;
