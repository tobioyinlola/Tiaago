"use client";

import * as Yup from "yup";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "react-daisyui";
import { Formik, FormikConfig } from "formik";

import { useAlert } from "@/app/common/store/useAlert";
import { TalentProfileStatus } from "@/app/common/types";
import { updateTalent } from "@/app/common/services/talents";
import { handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import { urlValidationSchema } from "@/app/common/constants/validationSchemas";
import verified from "@/public/assets/images/talents/verification/verified.png";
import step_1 from "@/public/assets/images/talents/verification/sections/step_1.png";
import step_2 from "@/public/assets/images/talents/verification/sections/step_2.png";
import step_3 from "@/public/assets/images/talents/verification/sections/step_3.png";
import TalentWorkExperiences from "@/app/talents/(dashboard)/settings/components/Tabs/ProfileTab/TalentWorkExperiences";

export const metadata = {
  title: "Talent Verification",
};

const TalentVerification = ({
  profileStatus,
}: {
  profileStatus: TalentProfileStatus;
}) => {
  const getInitialStep = () => {
    if (!profileStatus.has_added_work_experience) return 1;
    if (!profileStatus.has_social_media_links) return 2;
    if (!profileStatus.has_taken_assessment) return 3;
    return 4;
  };
  const [currentStep, setCurrentStep] = useState(getInitialStep());

  const nextStep = () => {
    setCurrentStep(Math.min(currentStep + 1, 4));
  };
  return (
    <main className='Ftext-black p-3 md:p-6 font-poppins'>
      {/* section 1 */}
      <div className='bg-[#FFF8E6] py-3.5 rounded-lg'>
        <h2 className='text-center text-base text-red-500 font-semibold'>
          Earn your verification badge
        </h2>
        <p className='text-center text-xs text-red-400 font-normal mt-1'>
          Complete Your Assessment to Become a verified Talent on Tiaago
        </p>
      </div>

      {/* section 2 */}
      <div className=''>
        <div className='border-2 border-[#F0F2F5] my-7 p-4 rounded-md md:flex justify-between'>
          <div className='md:w-1/12 md:m-0 my-4'>
            {currentStep == 1 && <Image src={step_1} alt='Step 1' />}
            {currentStep == 2 && <Image src={step_2} alt='Step 2' />}
            {currentStep == 3 && <Image src={step_3} alt='Step 3' />}
          </div>

          <div className='md:w-11/12 w-full'>
            <h2 className='font-semibold md:text-2xl text-base text-gray-800'>
              <span>Earn your verification badge</span>
              <Image
                className='inline -translate-y-0.5'
                src={verified}
                alt='verify-icon'
              />
            </h2>
            <p className='font-medium text-sm text-gray-500 my-1.5'>
              Complete all the steps to become a Verified Talent on Tiaago
            </p>

            <div className='md:grid grid-cols-2 gap-5 flex flex-col'>
              <button
                className='label btn cursor-default no-animation hover:bg-transparent border-2 border-[#F0F2F5] hover:border-[#F0F2F5] py-1.5 px-3 text-base font-semibold bg-transparent'
                disabled
              >
                Create an Account
                <input
                  type='checkbox'
                  checked
                  readOnly
                  className='checkbox checkbox-success checkbox-sm cursor-default'
                />
              </button>

              <button
                className='label btn cursor-default no-animation hover:bg-transparent border-2 border-[#F0F2F5] hover:border-[#F0F2F5] py-1.5 px-3 text-base font-semibold bg-transparent'
                disabled={currentStep > 1}
              >
                Add Work Experience
                <input
                  type='checkbox'
                  className='checkbox checkbox-success checkbox-sm cursor-default'
                  readOnly
                  checked={currentStep > 1}
                />
              </button>

              <button
                className='label btn cursor-default no-animation hover:bg-transparent border-2 border-[#F0F2F5] hover:border-[#F0F2F5] py-1.5 px-3 text-base font-semibold bg-transparent'
                disabled={currentStep > 2}
              >
                Add Social Media Links
                <input
                  type='checkbox'
                  className='checkbox checkbox-success checkbox-sm cursor-default'
                  readOnly
                  checked={currentStep > 2}
                />
              </button>

              <button className='label btn cursor-default no-animation hover:bg-transparent border-2 border-[#F0F2F5] hover:border-[#F0F2F5] py-1.5 px-3 text-base font-semibold bg-transparent'>
                Take Assessment
                <input
                  type='checkbox'
                  className='checkbox checkbox-success checkbox-sm cursor-default'
                  readOnly
                />
              </button>
            </div>
          </div>
        </div>

        {currentStep == 1 && <Step_1 nextStep={nextStep} />}
        {currentStep == 2 && <Step_2 nextStep={nextStep} />}
        {currentStep == 3 && <Step_3 />}
      </div>
    </main>
  );
};

const Step_1 = ({ nextStep }: { nextStep: VoidFunction }) => {
  return (
    <div className='border-2 border-[#F0F2F5] my-7 p-4 rounded-md'>
      <h2 className='bg-[#D4DAFF] p-4 text-2xl font-bold rounded-t-lg text-[#343A40] mb-5'>
        Work Experience
      </h2>

      <TalentWorkExperiences isTalentVerification onNextClick={nextStep} />
    </div>
  );
};

const Step_2 = ({ nextStep }: { nextStep: VoidFunction }) => {
  const setAlert = useAlert(state => state.setAlert);

  const initialValues = { twitterUrl: "", linkedInUrl: "" };

  const onSubmit: FormikConfig<typeof initialValues>["onSubmit"] = (
    values,
    { setSubmitting, setFieldError }
  ) => {
    const social_media_links = [
      {
        name: "Twitter",
        url: values.twitterUrl.startsWith("http")
          ? values.twitterUrl
          : `https://${values.twitterUrl}`,
      },
      {
        name: "LinkedIn",
        url: values.linkedInUrl.startsWith("http")
          ? values.linkedInUrl
          : `https://${values.linkedInUrl}`,
      },
    ];
    toast.dismiss();
    updateTalent({ social_media_links }, "profile")
      .then(res => {
        // setProfile(res);
        if (!res.success) {
          handleFormSubmissionError(res.error, setFieldError, setAlert);
        } else {
          toast.success("Social Media Links updated successfully");
          nextStep();
        }
      })
      .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
      .finally(() => setSubmitting(false));
  };
  return (
    <div className='border-2 border-[#F0F2F5] my-7 p-4 rounded-md'>
      <h2 className='bg-[#D4DAFF] p-4 text-2xl font-bold rounded-t-lg text-[#343A40] mb-5'>
        Social Media Links
      </h2>

      <Formik
        initialValues={initialValues}
        onSubmit={onSubmit}
        validationSchema={Yup.object().shape({
          twitterUrl: urlValidationSchema.label("Twitter URL"),
          linkedInUrl: urlValidationSchema.label("LinkedIn URL"),
        })}
      >
        {({ handleSubmit, errors, isSubmitting, values, touched }) => (
          <form onSubmit={handleSubmit}>
            <div className='flex-wrap md:flex justify-between'>
              <FormikField
                name='linkedInUrl'
                label='LinkedIn URL'
                value={values.linkedInUrl}
                error={errors.linkedInUrl}
                touched={touched.linkedInUrl}
                placeholder='https://www.linkedin.com/in/scott-myers-76'
                type='url'
                className='md:w-[48%] [&_input]:w-full'
              />
              <FormikField
                name='twitterUrl'
                label='Twitter URL'
                value={values.twitterUrl}
                error={errors.twitterUrl}
                touched={touched.twitterUrl}
                type='url'
                placeholder='https//www.x.com/scott____?t=8Ge547gfd'
                className='md:w-[48%] [&_input]:w-full'
              />
            </div>
            <div className='flex justify-end mt-10'>
              <Button
                className='btn py-2.5 px-8 border border-[#5465FF] bg-transparent text-base font-semibold'
                type='submit'
                loading={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Next"}
              </Button>
            </div>
          </form>
        )}
      </Formik>
    </div>
  );
};

const Step_3 = () => {
  return (
    <div>
      <h2 className='bg-[#D4DAFF] p-4 text-2xl font-bold rounded-t-lg text-[#343A40] mb-5'>
        Assessment
      </h2>
      <div className='flex justify-end'>
        <Link
          className='btn py-2.5 px-8 btn-primary text-base font-semibold'
          href='/talents/assessments'
        >
          Take Assessment
        </Link>
      </div>
    </div>
  );
};

export default TalentVerification;
