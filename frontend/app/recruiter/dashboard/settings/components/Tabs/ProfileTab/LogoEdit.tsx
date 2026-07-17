"use client";

import { toast } from "sonner";
import { useRef } from "react";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";
import { useRouter } from "next/navigation";

import { Recruiter } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { handleFormSubmissionError } from "@/app/common/utils";
import { updateRecruiter } from "@/app/common/services/recruiters";
import FileInput from "@/app/common/components/Forms/FileInput";
import { useRecruiterStore } from "@/app/recruiter/dashboard/store";
import { logoValidationSchema } from "../../../constants/recruiterProfileForm";
import { AvatarWithVerifiedBadge } from "@/app/common/components/UserAvatar";

const LogoEdit = ({ serverProfile }: { serverProfile: Recruiter }) => {
  const router = useRouter();
  const [_profile, setProfile] = useRecruiterStore(state => [
    state.profile,
    state.setProfile,
  ]);
  const setAlert = useAlert(state => state.setAlert);
  const profile = _profile ?? serverProfile;
  const formRef = useRef<HTMLFormElement>(null);
  const { profile_pic, first_name, verified } = profile;
  return (
    <Formik
      initialValues={{ profile_pic: "" }}
      validationSchema={logoValidationSchema}
      onSubmit={(_, { setSubmitting, setFieldError }) => {
        const formData = new FormData(formRef.current!);
        updateRecruiter(formData, "profile")
          .then(data => {
            setProfile(data);
            toast.dismiss();
            toast.success("Logo updated successfully");
            router.refresh();
          })
          .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
          .finally(() => setSubmitting(false));
      }}
    >
      {({ handleSubmit, errors, touched, isSubmitting, values, dirty }) => (
        <form
          onSubmit={handleSubmit}
          ref={formRef}
          className='w-full max-md:max-w-md max-md:mx-auto'
        >
          <h2 className='text-base font-bold'>Company Logo</h2>
          <p className='text-sm text-gray-500 md:border-b border-outline pb-4'>
            This will be displayed on your profile.
          </p>
          <div className='mt-7 md:max-w-md'>
            <div className='flex max-md:flex-col items-center gap-5'>
              <AvatarWithVerifiedBadge
                profilePic={values.profile_pic || profile_pic}
                firstName={first_name}
                lastName=''
                verified={verified}
                className='w-[120px]'
                size={32}
                forCurrentUser
              />
              <FileInput
                name='profile_pic'
                value={values.profile_pic}
                touched={touched.profile_pic}
                error={errors.profile_pic}
                label=''
              />
            </div>
            <Button
              disabled={!dirty}
              loading={isSubmitting}
              type='submit'
              color='primary'
              className='max-md:w-full'
            >
              {isSubmitting ? "Updating..." : "Update"}
            </Button>
          </div>
        </form>
      )}
    </Formik>
  );
};

export default LogoEdit;
