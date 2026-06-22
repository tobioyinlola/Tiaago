"use client";

import { toast } from "sonner";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  communityFormFields,
  communityFormValidationSchema,
} from "./communityForm.constants";
import { useAlert } from "@/app/common/store/useAlert";
import { ButtonModal } from "@/app/common/components/Modal";
import { handleFormSubmissionError } from "@/app/common/utils";
import { createCommunity } from "@/app/common/services/payments";
import FormikField from "@/app/common/components/Forms/FormikField";

interface AddCommunityModalProps {
  refresh?: boolean;
}

interface CommunityFormValues {
  name: string;
  description: string;
}

const AddCommunityModal: React.FC<AddCommunityModalProps> = ({ refresh }) => {
  const router = useRouter();
  const modalRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const setAlert = useAlert(state => state.setAlert);

  const initialValues: CommunityFormValues = {
    name: "",
    description: "",
  };

  return (
    <ButtonModal
      buttonText='Add Community'
      buttonClassName='btn btn-primary btn-outline'
      id='add-community'
      modalRef={modalRef}
      disableClose={loading}
      disablePadding
      className='w-full'
      autoHeight
    >
      <div className='border-b p-6'>
        <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
          Add Community
        </h3>
        <p className='text-[#999] text-sm -tracking-[0.1px]'>
          Create a new community for your coupons
        </p>
      </div>

      <Formik<CommunityFormValues>
        initialValues={initialValues}
        validationSchema={communityFormValidationSchema}
        onSubmit={async (values, { setFieldError }) => {
          if (loading) return;
          setLoading(true);
          toast.dismiss();

          try {
            const res = await createCommunity(values);

            if (res.success) {
              toast.success("Community created successfully");
              modalRef.current?.close();
              if (refresh) router.refresh();
            } else {
              handleFormSubmissionError(res.error, setFieldError, setAlert);
            }
          } catch (err: any) {
            handleFormSubmissionError(err, setFieldError, setAlert);
          } finally {
            setLoading(false);
          }
        }}
      >
        {({ handleSubmit, errors, touched, values }) => (
          <form onSubmit={handleSubmit} className='my-5 p-6'>
            {communityFormFields.map(field => {
              const { name, type, label } = field;
              const error = errors[name as keyof CommunityFormValues];
              const isTouched = touched[name as keyof CommunityFormValues];

              return (
                <FormikField
                  key={name}
                  {...field}
                  name={name}
                  label={label}
                  type={type}
                  value={values[name as keyof CommunityFormValues]}
                  error={error}
                  touched={Boolean(isTouched)}
                />
              );
            })}

            <Button
              type='submit'
              color='primary'
              loading={loading}
              className='text-white mt-3 w-full'
            >
              {loading ? "Creating..." : "Create Community"}
            </Button>
          </form>
        )}
      </Formik>
    </ButtonModal>
  );
};

export default AddCommunityModal;
