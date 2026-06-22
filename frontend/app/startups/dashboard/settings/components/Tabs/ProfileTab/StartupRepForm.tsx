"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";
import { GroupBase } from "react-select";

import {
  startupRepFormFields,
  getStartupRepInitiaValues,
  startupRepValidationSchema,
} from "../../../constants/startupProfileForm";

import {
  CountryField,
  Startup,
  TalentRole as StartupRole,
} from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { updateStartup } from "@/app/common/services/startups";
import { handleFormSubmissionError } from "@/app/common/utils";
import { useStartupStore } from "@/app/startups/dashboard/store";
import FormikField from "@/app/common/components/Forms/FormikField";
import CountrySelect from "@/app/common/components/Forms/CountrySelect";

export type StartupRepFormProps = {
  groupedCountries: GroupBase<CountryField>[];
  serverProfile: Startup;
  startupRoles: StartupRole[];
};

const StartupRepForm = ({
  groupedCountries,
  serverProfile,
  startupRoles,
}: StartupRepFormProps) => {
  const [_profile, setProfile] = useStartupStore(state => [
    state.profile,
    state.setProfile,
  ]);
  const setAlert = useAlert(state => state.setAlert);
  const user = _profile ?? serverProfile;
  return (
    <Formik
      initialValues={getStartupRepInitiaValues(user)}
      onSubmit={(values, { setSubmitting, setFieldError }) => {
        updateStartup(values)
          .then(data => {
            toast.dismiss();
            setProfile(data);
            toast.success("Profile updated successfully");
          })
          .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
          .finally(() => setSubmitting(false));
      }}
      validationSchema={startupRepValidationSchema}
    >
      {({ handleSubmit, errors, touched, isSubmitting, values, dirty }) => (
        <form
          onSubmit={handleSubmit}
          className='w-full max-md:max-w-md max-md:mx-auto'
        >
          <div className='flex justify-between border-b border-outline pb-5 mb-5'>
            <div>
              <h2 className='text-gray-900 text-base font-bold'>
                Startup Representative
              </h2>
              <p className='text-sm text-gray-500'>
                Update the information of your representative
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
            {startupRepFormFields.map(({ name, ...props }) => {
              const value = values[name];
              if (name === "country")
                return (
                  <CountrySelect
                    key={name}
                    {...{ name, value, ...props }}
                    type='select'
                    options={groupedCountries}
                    error={errors[name]}
                    touched={touched[name]}
                    {...(props.type === "select" && {
                      selectFieldProps: {
                        ...props.selectFieldProps,
                        defaultValue: groupedCountries
                          .flatMap(gc => gc.options)
                          .find(c => c.value === user.country),
                      },
                    })}
                  />
                );

              return (
                <FormikField
                  key={name}
                  {...{ name, value, ...props }}
                  error={errors[name]}
                  touched={touched[name]}
                  {...(name === "role" && {
                    selectFieldProps: {
                      options: startupRoles.map(({ title, slug }) => ({
                        label: title,
                        value: slug,
                      })),
                      defaultValue: startupRoles.find(
                        r => r.slug === user.role
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

export default StartupRepForm;
