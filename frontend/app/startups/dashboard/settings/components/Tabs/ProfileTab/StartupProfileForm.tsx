"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";

import { Startup } from "@/app/common/types";
import {
  startupProfileFormFields,
  getStartupProfileInitiaValues,
  startupProfileValidationSchema,
} from "../../../constants/startupProfileForm";
import { useAlert } from "@/app/common/store/useAlert";
import { handleFormSubmissionError } from "@/app/common/utils";
import { updateStartup } from "@/app/common/services/startups";
import { useStartupStore } from "@/app/startups/dashboard/store";
import FormikField from "@/app/common/components/Forms/FormikField";
import { companySizeOptions } from "@/app/startups/signup/constants/form.contants";

const StartupProfileForm = ({
  serverProfile,
}: {
  serverProfile: Startup;
}) => {
  const [_profile, setProfile] = useStartupStore(state => [
    state.profile,
    state.setProfile,
  ]);
  const setAlert = useAlert(state => state.setAlert);
  const profile = _profile ?? serverProfile;
  return (
    <Formik
      initialValues={getStartupProfileInitiaValues(profile)}
      onSubmit={(values, { setSubmitting, setFieldError }) => {
        updateStartup(values, "profile")
          .then(data => {
            toast.dismiss();
            setProfile(data);
            toast.success("Profile updated successfully");
          })
          .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
          .finally(() => setSubmitting(false));
      }}
      validationSchema={startupProfileValidationSchema}
    >
      {({ handleSubmit, errors, touched, isSubmitting, values, dirty }) => (
        <form
          onSubmit={handleSubmit}
          className='w-full max-md:max-w-md max-md:mx-auto'
        >
          <div className='flex justify-between border-b border-outline pb-5 mb-5'>
            <div>
              <h2 className='text-gray-900 text-base font-bold'>
                Startup Profile
              </h2>
              <p className='text-sm text-gray-500'>
                Update your Startup details here.
              </p>
            </div>
            <div className='flex items-center gap-3 max-sm:flex-col'>
              <Link
                href='/startups/dashboard'
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
            {startupProfileFormFields.map(({ name, ...props }) => {
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

export default StartupProfileForm;
