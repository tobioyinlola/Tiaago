"use client";

import { toast } from "sonner";
import { useRef } from "react";
import { Formik } from "formik";
import { Button } from "react-daisyui";
import { useRouter } from "next/navigation";

import { Staff } from "@/app/common/types";
import { updateStaff } from "@/app/common/services/staff";
import { useAdminStore } from "@/app/admin/(dashboard)/store";
import { handleFormSubmissionError } from "@/app/common/utils";
import FileInput from "@/app/common/components/Forms/FileInput";
import { AvatarWithVerifiedBadge } from "@/app/common/components/UserAvatar";
import { profilePictureValidationSchema } from "../../../constants/form.constants";

const ProfilePicEdit = ({ serverProfile }: { serverProfile: Staff }) => {
  const router = useRouter();
  const [_profile, setProfile] = useAdminStore(state => [
    state.profile,
    state.setProfile,
  ]);
  const profile = _profile ?? serverProfile;
  const formRef = useRef<HTMLFormElement>(null);
  const { profile_pic, first_name } = profile;
  return (
    <Formik
      initialValues={{ profile_pic: "" }}
      validationSchema={profilePictureValidationSchema}
      onSubmit={(_, { setSubmitting, setFieldError }) => {
        const formData = new FormData(formRef.current!);
        updateStaff(formData)
          .then(data => {
            setProfile(data);
            toast.dismiss();
            toast.success("Profile photo updated successfully");
            router.refresh();
          })
          .catch(err => handleFormSubmissionError(err, setFieldError))
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
                profilePic={values.profile_pic || profile_pic}
                firstName={first_name}
                lastName=''
                verified
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
