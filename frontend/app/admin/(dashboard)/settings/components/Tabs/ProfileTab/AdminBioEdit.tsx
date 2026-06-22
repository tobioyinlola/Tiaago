"use client";

import { toast } from "sonner";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";

import { Staff } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { updateStaff } from "@/app/common/services/staff";
import { useAdminStore } from "@/app/admin/(dashboard)/store";
import { handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import { getBioValidationSchema } from "../../../constants/form.constants";

const AdminBioEdit = ({ serverProfile }: { serverProfile: Staff }) => {
  const [_profile, setProfile] = useAdminStore(state => [
    state.profile,
    state.setProfile,
  ]);
  const setAlert = useAlert(state => state.setAlert);
  const profile = _profile ?? serverProfile;
  return (
    <Formik
      initialValues={{ bio: profile.bio ?? "" }}
      validationSchema={getBioValidationSchema()}
      onSubmit={(values, { setSubmitting, setFieldError }) => {
        updateStaff(values)
          .then(data => {
            setProfile(data);
            toast.dismiss();
            toast.success("Bio updated successfully");
          })
          .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
          .finally(() => setSubmitting(false));
      }}
    >
      {({ handleSubmit, errors, touched, isSubmitting, values, dirty }) => (
        <form
          onSubmit={handleSubmit}
          className='max-md:max-w-md max-md:mx-auto'
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

export default AdminBioEdit;
