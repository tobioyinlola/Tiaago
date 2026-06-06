"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Button } from "react-daisyui";
import { GroupBase } from "react-select";
import { Formik, type FormikConfig } from "formik";

import {
  personalInfoValidationSchema,
  getPersonalInfoInitiaValues,
  personalInfoFormFields,
} from "../../../constants/personalInfoForm";
import { useAlert } from "@/app/common/store/useAlert";
import { Talent, CountryField } from "@/app/common/types";
import { updateTalent } from "@/app/common/services/talents";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import { handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import CountrySelect from "@/app/common/components/Forms/CountrySelect";

export type ProfileInfoFormProps = {
  groupedCountries: GroupBase<CountryField>[];
  serverProfile: Talent;
};

const PersonalInfoForm = ({
  groupedCountries,
  serverProfile,
}: ProfileInfoFormProps) => {
  const [_profile, setProfile] = useTalentStore(state => [
    state.profile,
    state.setProfile,
  ]);
  const setAlert = useAlert(state => state.setAlert);
  const user = _profile ?? serverProfile;
  const onSubmit: FormikConfig<
    ReturnType<typeof getPersonalInfoInitiaValues>
  >["onSubmit"] = (values, { setSubmitting, setFieldError }) => {
    toast.dismiss();
    updateTalent(values)
      .then(data => {
        if (!data.success) {
          handleFormSubmissionError(data.error, setFieldError, setAlert);
        } else {
          setProfile(data.data!);
          toast.success("Profile updated successfully");
        }
      })
      .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
      .finally(() => setSubmitting(false));
  };

  return (
    <Formik
      initialValues={getPersonalInfoInitiaValues(user)}
      onSubmit={onSubmit}
      validationSchema={personalInfoValidationSchema}
    >
      {({ handleSubmit, errors, touched, isSubmitting, values, dirty }) => (
        <form
          onSubmit={handleSubmit}
          className='w-full max-md:max-w-md max-md:mx-auto dashboard-content-constraint'
        >
          <div className='flex justify-between border-b border-outline pb-5 mb-5'>
            <div>
              <h2 className='text-[#2E3031] text-base font-bold'>
                Personal information
              </h2>
              <p className='text-sm text-[#6C757D]'>
                Update your personal details here.
              </p>
            </div>
            <div className='flex items-center gap-3 max-sm:flex-col'>
              <Link
                href='/talents/dashboard'
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
            {personalInfoFormFields.map(({ name, ...props }) => {
              const value = values[name];
              if (name === "country")
                return (
                  <CountrySelect
                    key={name}
                    {...{ name, value, ...props }}
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
                />
              );
            })}
          </div>
        </form>
      )}
    </Formik>
  );
};

export default PersonalInfoForm;
