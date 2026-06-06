"use client";
import { toast } from "sonner";
import { Button } from "react-daisyui";
import { Formik, FormikConfig } from "formik";

import {
  paymentInfoFormFields,
  paymentInfoValidationSchema,
} from "../../../../constants/paymentInfoForm";

import { Talent } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { updateTalent } from "@/app/common/services/talents";
import { handleFormSubmissionError } from "@/app/common/utils";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import FormikField from "@/app/common/components/Forms/FormikField";

export type TalentPaymentAccountsProps = {
  serverProfile: Talent;
};

const TalentPaymentAccounts = ({
  serverProfile,
}: TalentPaymentAccountsProps) => {
  const [_profile, setProfile] = useTalentStore(state => [
    state.profile,
    state.setProfile,
  ]);
  const setAlert = useAlert(state => state.setAlert);
  const user = _profile ?? serverProfile;
  const { account_name = "", account_number = "", bank_name = "" } = user;
  const initialValues = { account_name, account_number, bank_name };
  const onSubmit: FormikConfig<typeof initialValues>["onSubmit"] = (
    values,
    { setSubmitting, setFieldError }
  ) => {
    toast.dismiss();
    updateTalent(values, "profile")
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
      initialValues={initialValues}
      onSubmit={onSubmit}
      validationSchema={paymentInfoValidationSchema}
    >
      {({ handleSubmit, errors, touched, isSubmitting, values, dirty }) => (
        <form
          onSubmit={handleSubmit}
          className='max-md:max-w-md max-md:mx-auto dashboard-content-constraint'
          id='bank-details'
        >
          <div className='border-outline md:border-b pb-5 mb-5'>
            <h2 className='text-gray-900 text-base font-bold'>
              Payment Information
            </h2>
            <p className='text-sm text-gray-500'>
              These details will be displayed on your invoices and all payments
              will be made directly to you.
            </p>
          </div>
          {paymentInfoFormFields.map(({ name, ...props }) => {
            const value = values[name];
            return (
              <FormikField
                key={name}
                {...{ name, value, ...props }}
                error={errors[name]}
                touched={touched[name]}
              />
            );
          })}
          <Button
            disabled={!dirty}
            loading={isSubmitting}
            type='submit'
            color='primary'
            className='max-sm:btn-sm mt-5'
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </form>
      )}
    </Formik>
  );
};

export default TalentPaymentAccounts;
