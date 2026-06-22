"use client";

import Link from "next/link";
import { toast } from "sonner";
import Button from "@/app/common/components/DaisyButton";
import { GroupBase } from "react-select";
import { Formik, type FormikConfig } from "formik";

import {
  getPersonalInfoInitiaValues,
  personalInfoFormFields,
  personalInfoValidationSchema,
} from "../../../constants/form.constants";
import { useAlert } from "@/app/common/store/useAlert";
import { Staff, CountryField } from "@/app/common/types";
import { updateStaff } from "@/app/common/services/staff";
import { useAdminStore } from "@/app/admin/(dashboard)/store";
import { handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import CountrySelect from "@/app/common/components/Forms/CountrySelect";

export type ProfileInfoFormProps = {
  groupedCountries: GroupBase<CountryField>[];
  serverProfile: Staff;
};

const PersonalInfoForm = ({
  groupedCountries,
  serverProfile,
}: ProfileInfoFormProps) => {
  const [_profile, setProfile] = useAdminStore(state => [
    state.profile,
    state.setProfile,
  ]);
  const setAlert = useAlert(state => state.setAlert);
  const user = _profile ?? serverProfile;
  const onSubmit: FormikConfig<
    ReturnType<typeof getPersonalInfoInitiaValues>
  >["onSubmit"] = (values, { setSubmitting, setFieldError }) => {
    updateStaff(values)
      .then(data => {
        setProfile(data);
        toast.dismiss();
        toast.success("Profile updated successfully");
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
          className='w-full max-md:max-w-md max-md:mx-auto'
        >
          <div className='flex justify-between border-b border-outline pb-5 mb-5'>
            <div>
              <h2 className='text-gray-900 text-base font-bold'>
                Personal information
              </h2>
              <p className='text-sm text-gray-500'>
                Update your personal details here.
              </p>
            </div>
            <div className='flex items-center gap-3 max-sm:flex-col'>
              <Link href='/admin' className='btn btn-outline max-sm:btn-sm'>
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
