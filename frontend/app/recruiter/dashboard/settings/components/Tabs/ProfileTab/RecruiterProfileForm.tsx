"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";

import { Recruiter } from "@/app/common/types";
import {
  recruiterProfileFormFields,
  getRecruiterProfileInitiaValues,
  recruiterProfileValidationSchema,
} from "../../../constants/recruiterProfileForm";
import { useAlert } from "@/app/common/store/useAlert";
import { handleFormSubmissionError, normalizeWebsiteUrl } from "@/app/common/utils";
import { updateRecruiter } from "@/app/common/services/recruiters";
import { useRecruiterStore } from "@/app/recruiter/dashboard/store";
import FormikField from "@/app/common/components/Forms/FormikField";
import { companySizeOptions } from "@/app/recruiter/signup/constants/form.contants";

const RecruiterProfileForm = ({
  serverProfile,
}: {
  serverProfile: Recruiter;
}) => {
  const [_profile, setProfile] = useRecruiterStore(state => [
    state.profile,
    state.setProfile,
  ]);
  const setAlert = useAlert(state => state.setAlert);
  const profile = _profile ?? serverProfile;
  return (
    <Formik
      initialValues={getRecruiterProfileInitiaValues(profile)}
      onSubmit={(values, { setSubmitting, setFieldError }) => {
        updateRecruiter(
          { ...values, website: normalizeWebsiteUrl(values.website) },
          "profile"
        )
          .then(data => {
            toast.dismiss();
            setProfile(data);
            toast.success("Profile updated successfully");
          })
          .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
          .finally(() => setSubmitting(false));
      }}
      validationSchema={recruiterProfileValidationSchema}
    >
      {({ handleSubmit, errors, touched, isSubmitting, values, dirty }) => (
        <form
          onSubmit={handleSubmit}
          className='w-full max-md:max-w-md max-md:mx-auto'
        >
          <div className='flex justify-between border-b border-outline pb-5 mb-5'>
            <div>
              <h2 className='text-gray-900 text-base font-bold'>
                Recruiter Profile
              </h2>
              <p className='text-sm text-gray-500'>
                Update your Recruiter details here.
              </p>
            </div>
            <div className='flex items-center gap-3 max-sm:flex-col'>
              <Link
                href='/recruiter/dashboard'
                className='btn btn-outline max-sm:btn-sm'
              >
                Cancel
              </Link>
              <Button
                disabled={!dirty}
                loading={isSubmitting}
                type='submit'
                color='primary'
                className='max-sm:btn-sm max-sm:w-full'
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
          <div className='flex-wrap md:flex justify-between'>
            {recruiterProfileFormFields.map(({ name, ...props }) => {
              const value = values[name];
              return (
                <FormikField
                  key={name}
                  {...{ name, value, ...props }}
                  error={errors[name]}
                  touched={touched[name]}
                  {...(props.type === "select" &&
                    name === "size" && {
                      selectFieldProps: {
                        ...props.selectFieldProps,
                        defaultValue: companySizeOptions.find(
                          s => s.value === profile?.size
                        ),
                      },
                    })}
                />
              );
            })}
          </div>
        </form>
      )}
    </Formik>
  );
};

export default RecruiterProfileForm;
