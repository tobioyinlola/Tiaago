"use client";
import * as Yup from "yup";
import { toast } from "sonner";
import { Formik } from "formik";
import { Button } from "react-daisyui";

import { Talent } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { updateTalent } from "@/app/common/services/talents";
import { handleFormSubmissionError } from "@/app/common/utils";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import FormikField from "@/app/common/components/Forms/FormikField";
import { richtextValidationSchema } from "@/app/common/constants/validationSchemas";

const BioEdit = ({ serverProfile }: { serverProfile: Talent }) => {
  const [_profile, setProfile] = useTalentStore(state => [
    state.profile,
    state.setProfile,
  ]);
  const setAlert = useAlert(state => state.setAlert);
  const profile = _profile ?? serverProfile;
  return (
    <Formik
      initialValues={{ bio: profile.bio }}
      validationSchema={Yup.object().shape({
        bio: richtextValidationSchema(255, "Bio"),
      })}
      onSubmit={(values, { setSubmitting, setFieldError }) => {
        updateTalent(values)
          .then(res => {
            if (!res.success) {
              handleFormSubmissionError(res.error, setFieldError, setAlert);
            } else {
              toast.success("Profile updated successfully");
              setProfile(res.data!);
            }
          })
          .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
          .finally(() => setSubmitting(false));
      }}
    >
      {({ handleSubmit, errors, touched, isSubmitting, values, dirty }) => (
        <form
          onSubmit={handleSubmit}
          className='w-full max-md:max-w-md max-md:mx-auto'
        >
          <h2 className='text-base font-bold'>Bio</h2>
          <p className='text-sm text-gray-500 mb-7 md:border-b border-outline pb-4'>
            Write a short introduction.
          </p>
          <div className='md:max-w-md'>
            <FormikField
              name='bio'
              label=''
              value={values.bio}
              error={errors.bio}
              touched={touched.bio}
              type='richtext'
            />
            <Button
              disabled={!dirty}
              loading={isSubmitting}
              type='submit'
              color='primary'
              className='mt-4 max-md:w-full'
            >
              {isSubmitting ? "Updating..." : "Update"}
            </Button>
          </div>
        </form>
      )}
    </Formik>
  );
};

export default BioEdit;
