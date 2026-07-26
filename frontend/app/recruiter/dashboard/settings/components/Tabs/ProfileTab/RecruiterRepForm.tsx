"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";
import { GroupBase } from "react-select";

import {
  recruiterRepFormFields,
  getRecruiterRepInitiaValues,
  recruiterRepValidationSchema,
} from "../../../constants/recruiterProfileForm";

import {
  CountryField,
  Recruiter,
  TalentRole as RecruiterRole,
} from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { updateRecruiter } from "@/app/common/services/recruiters";
import { handleFormSubmissionError } from "@/app/common/utils";
import { useRecruiterStore } from "@/app/recruiter/dashboard/store";
import FormikField from "@/app/common/components/Forms/FormikField";
import CountrySelect from "@/app/common/components/Forms/CountrySelect";

export type RecruiterRepFormProps = {
  groupedCountries: GroupBase<CountryField>[];
  serverProfile: Recruiter;
  recruiterRoles: RecruiterRole[];
};

const RecruiterRepForm = ({
  groupedCountries,
  serverProfile,
  recruiterRoles,
}: RecruiterRepFormProps) => {
  const [_profile, setProfile] = useRecruiterStore(state => [
    state.profile,
    state.setProfile,
  ]);
  const setAlert = useAlert(state => state.setAlert);
  const user = _profile ?? serverProfile;
  return (
    <Formik
      initialValues={getRecruiterRepInitiaValues(user)}
      onSubmit={(values, { setSubmitting, setFieldError }) => {
        updateRecruiter(values)
          .then(data => {
            toast.dismiss();
            setProfile(data);
            toast.success("Profile updated successfully");
          })
          .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
          .finally(() => setSubmitting(false));
      }}
      validationSchema={recruiterRepValidationSchema}
    >
      {({ handleSubmit, errors, touched, isSubmitting, values, dirty }) => (
        <form
          onSubmit={handleSubmit}
          className='w-full max-md:max-w-md max-md:mx-auto'
        >
          <div className='flex justify-between border-b border-outline pb-5 mb-5'>
            <div>
              <h2 className='text-gray-900 text-base font-bold'>
                Recruiter Representative
              </h2>
              <p className='text-sm text-gray-500'>
                Update the information of your representative
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
            {recruiterRepFormFields.map(({ name, ...props }) => {
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
                  {...(name === "role" && props.type === "select" && {
                    selectFieldProps: {
                      ...props.selectFieldProps,
                      options: recruiterRoles.map(({ title, slug }) => ({
                        label: title,
                        value: slug,
                      })),
                      // Controlled by Formik's values.role (fixed to actually
                      // load from the saved profile above) rather than an
                      // uncontrolled defaultValue -- otherwise saving without
                      // touching this field would submit an empty role and
                      // wipe a previously-saved one. Falls back to a
                      // synthesized option since this field is "createable"
                      // (free text), so a saved role that isn't one of the
                      // predefined recruiterRoles still displays correctly.
                      value: values.role
                        ? recruiterRoles.find(r => r.slug === values.role) ?? {
                            // Use the human-readable title for the still-
                            // unmodified saved role (values.role here is a
                            // slug, e.g. "sourcing-lead" -- not fit to show
                            // as-is); once the user picks/types something
                            // new, its own text is already the right label.
                            label:
                              values.role === user.role && user.role_display
                                ? user.role_display
                                : values.role,
                            value: values.role,
                          }
                        : null,
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

export default RecruiterRepForm;
