"use client";
import * as Yup from "yup";
import { toast } from "sonner";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";

import { Talent } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { updateTalent } from "@/app/common/services/talents";
import { handleFormSubmissionError } from "@/app/common/utils";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import FormikField from "@/app/common/components/Forms/FormikField";
import { urlValidationSchema } from "@/app/common/constants/validationSchemas";

const PortfolioEdit = ({ serverProfile }: { serverProfile: Talent }) => {
  const [_profile, setProfile] = useTalentStore(state => [
    state.profile,
    state.setProfile,
  ]);
  const setAlert = useAlert(state => state.setAlert);
  const profile = _profile ?? serverProfile;
  const { portfolio } = profile;
  return (
    <Formik
      initialValues={{ portfolio }}
      validationSchema={Yup.object().shape({
        portfolio: urlValidationSchema.label("Portfolio link"),
      })}
      onSubmit={({ portfolio }, { setSubmitting, setFieldError }) => {
        updateTalent(
          {
            portfolio: portfolio.startsWith("http")
              ? portfolio
              : `https://${portfolio}`,
          },
          "profile"
        )
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
          <h2 className='text-base font-bold text-primary-black'>
            Link to proof of works
          </h2>
          <p className='text-sm text-secondary-black mb-6 md:border-b border-outline pb-4'>
            Share with us the link to your best works.
          </p>
          <FormikField
            name='portfolio'
            label='Portfolio link'
            value={values.portfolio}
            error={errors.portfolio}
            touched={touched.portfolio}
            type='url'
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
        </form>
      )}
    </Formik>
  );
};

export default PortfolioEdit;
