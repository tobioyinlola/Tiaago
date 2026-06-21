"use client";

import { toast } from "sonner";
import { Formik } from "formik";
import { Button } from "react-daisyui";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isNullOrUndef } from "@/app/common/utils";

import {
  createCoupon,
  updateCoupon,
  CreateCouponInput,
} from "@/app/common/services/payments";

import FormikField, {
  FormikFieldProps,
} from "@/app/common/components/Forms/FormikField";

import {
  couponFormFields,
  couponFormValidationSchema,
} from "./couponForm.constants";
import { ButtonModal } from "@/app/common/components/Modal";
import { useAlert } from "@/app/common/store/useAlert";
import { handleFormSubmissionError } from "@/app/common/utils";
import { Community, Coupon, PromiseResolvedType, ID } from "@/app/common/types";

interface CouponFormValues {
  community_id: ID;
  discount_amount_ngn: string | number;
  discount_amount_usd: string | number;
  discount_percent: string | number;
  max_usage: string | number;
  expires_at: string;
}

// Type guard to check if a value is a FormikFieldProps
type FormField = Omit<FormikFieldProps, "error" | "touched" | "value"> & {
  selectFieldProps?: {
    options: Array<{ label: string; value: ID }>;
  };
};

interface CouponModalFormProps {
  coupon?: Coupon;
  communities: Community[];
  refresh?: boolean;
}

const CouponModalForm: React.FC<CouponModalFormProps> = ({
  coupon,
  communities,
  refresh,
}) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const modalRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);

  const initialValues: CouponFormValues = {
    community_id: coupon?.community_id || "",
    discount_amount_ngn: coupon?.discount_amount_ngn || "",
    discount_amount_usd: coupon?.discount_amount_usd || "",
    discount_percent: coupon?.discount_percent || "",
    max_usage: coupon?.max_usage || "",
    expires_at: coupon?.expires_at?.slice(0, 16) || "",
  };

  // Update the community options in the form fields
  const fieldsWithCommunityOptions = couponFormFields.map(
    (field): FormField => {
      if (field.name === "community_id") {
        return {
          ...field,
          selectFieldProps: {
            ...field.selectFieldProps,
            options: communities.map(({ id, name }) => ({
              label: name,
              value: id,
            })),
          },
        } as FormField;
      }
      return field as FormField;
    }
  );

  return (
    <ButtonModal
      buttonText={coupon ? "Edit" : "Add Coupon"}
      id={coupon ? `edit-coupon-${coupon.id}` : "add-coupon"}
      buttonClassName={coupon ? "btn btn-sm btn-link" : "btn btn-primary"}
      modalRef={modalRef}
      disableClose={loading}
      disablePadding
      className='w-full'
    >
      <div className='border-b p-6 text-left'>
        <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
          {coupon ? "Edit Coupon" : "Add Coupon"}
        </h3>
        <p className='text-[#999] text-sm -tracking-[0.1px]'>
          {coupon ? "Update the coupon details" : "Fill in the coupon details"}
        </p>
      </div>
      <Formik<CouponFormValues>
        initialValues={initialValues}
        validationSchema={couponFormValidationSchema}
        onSubmit={async (values, { setFieldError }) => {
          if (loading) return;
          setLoading(true);
          toast.dismiss();

          // Convert string values to numbers where needed
          const submitValues: CreateCouponInput = {
            ...values,
            community_id: Number(values.community_id),
            discount_amount_ngn: values.discount_amount_ngn
              ? Number(values.discount_amount_ngn)
              : undefined,
            discount_amount_usd: values.discount_amount_usd
              ? Number(values.discount_amount_usd)
              : undefined,
            discount_percent: values.discount_percent
              ? Number(values.discount_percent)
              : undefined,
            max_usage: values.max_usage ? Number(values.max_usage) : undefined,
          };

          // remove empty values
          Object.keys(submitValues).forEach(key => {
            if (isNullOrUndef(submitValues[key as keyof CreateCouponInput])) {
              delete submitValues[key as keyof CreateCouponInput];
            }
          });

          try {
            let res: PromiseResolvedType<ReturnType<typeof createCoupon>>;
            if (coupon?.id) {
              res = await updateCoupon(coupon.id, submitValues);
            } else {
              res = await createCoupon(submitValues);
            }

            if (res.success) {
              toast.success(
                `Coupon ${coupon ? "updated" : "created"} successfully`
              );
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
        {({ handleSubmit, errors, touched, values }) => {
          // Helper function to get error message
          const getError = (fieldName: keyof CouponFormValues) => {
            const error = errors[fieldName];
            if (!error) return undefined;
            return typeof error === "string"
              ? error
              : String(Array.isArray(error) ? error[0] : "");
          };

          // Helper function to check if field is touched
          const isTouched = (fieldName: keyof CouponFormValues) => {
            return Boolean(touched[fieldName]);
          };

          // Helper to safely get field value
          const getFieldValue = (fieldName: keyof CouponFormValues) => {
            return values[fieldName];
          };

          return (
            <form onSubmit={handleSubmit} className='my-2 p-6 text-left'>
              {fieldsWithCommunityOptions.map(props => {
                const { name, type } = props as {
                  name: keyof CouponFormValues;
                  type: string;
                };
                const fieldValue = getFieldValue(name);
                const community = communities.find(
                  c => c.name === coupon?.community_name
                );
                const defaultValue = coupon
                  ? community
                    ? {
                        label: community.name,
                        value: community.id,
                      }
                    : undefined
                  : undefined;
                return (
                  <FormikField
                    key={name}
                    {...props}
                    name={name as string}
                    value={fieldValue}
                    error={getError(name)}
                    touched={isTouched(name)}
                    {...(type === "select" && {
                      selectFieldProps: {
                        ...props.selectFieldProps,
                        defaultValue,
                      },
                    })}
                  />
                );
              })}

              <Button
                type='submit'
                color='primary'
                loading={loading}
                className='text-white mt-3 w-full'
              >
                {loading
                  ? coupon
                    ? "Saving..."
                    : "Adding..."
                  : coupon
                  ? "Save Changes"
                  : "Add Coupon"}
              </Button>
            </form>
          );
        }}
      </Formik>
    </ButtonModal>
  );
};

export default CouponModalForm;
