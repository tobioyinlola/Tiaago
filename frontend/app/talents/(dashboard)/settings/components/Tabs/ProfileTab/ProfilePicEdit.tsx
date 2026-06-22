"use client";

import { toast } from "sonner";
import { useRef } from "react";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";
import { useRouter } from "next/navigation";

import { Talent } from "@/app/common/types";
import { updateTalent } from "@/app/common/services/talents";
import { handleFormSubmissionError } from "@/app/common/utils";
import FileInput from "@/app/common/components/Forms/FileInput";
import { useTalentStore } from "@/app/talents/(dashboard)/store";
import { AvatarWithVerifiedBadge } from "@/app/common/components/UserAvatar";
import { profilePictureValidationSchema } from "../../../constants/personalInfoForm";
import { useAlert } from "@/app/common/store/useAlert";

const ProfilePicEdit = ({ serverProfile }: { serverProfile: Talent }) => {
  const router = useRouter();
  const [_profile, setProfile] = useTalentStore(state => [
    state.profile,
    state.setProfile,
  ]);
  const user = _profile ?? serverProfile;
  const setAlert = useAlert(state => state.setAlert);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <Formik
      initialValues={{ profile_pic: "" }}
      validationSchema={profilePictureValidationSchema}
      onSubmit={(_, { setSubmitting, setFieldError }) => {
        const formData = new FormData(formRef.current!);
        toast.dismiss();
        updateTalent(formData, "profile")
          .then(data => {
            if (!data.success) {
              handleFormSubmissionError(data.error, setFieldError, setAlert);
            } else {
              toast.success("Profile photo updated successfully");
              setProfile(data.data!);
              router.refresh();
            }
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
          <h2 className='text-base font-bold'>Your photo</h2>
          <p className='text-sm text-gray-500 md:border-b border-outline pb-4'>
            This will be displayed on your profile.
          </p>
          <div className='mt-7 md:max-w-md'>
            <div className='flex max-md:flex-col items-center gap-5'>
              <AvatarWithVerifiedBadge
                profilePic={values.profile_pic || user?.profile_pic}
                firstName={user?.first_name ?? ""}
                lastName=''
                verified={!!user?.has_passed_assessment}
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

export default ProfilePicEdit;
