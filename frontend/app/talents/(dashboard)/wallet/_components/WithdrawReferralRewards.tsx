"use client";

import * as yup from "yup";
import { toast } from "sonner";
import { Formik } from "formik";
import { Button } from "react-daisyui";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useAlert } from "@/app/common/store/useAlert";
import { ButtonModal } from "@/app/common/components/Modal";
import { handleFormSubmissionError } from "@/app/common/utils";
import { requestWithdrawal } from "@/app/common/services/profile";
import FormikField from "@/app/common/components/Forms/FormikField";

interface WithdrawReferralRewardsProps {
  refresh?: boolean;
  balance: number;
  accountNumber?: string;
}

interface CommunityFormValues {
  amount: number;
}

const MIN_WITHDRAWAL_AMOUNT = 1000;

const WithdrawReferralRewards: React.FC<WithdrawReferralRewardsProps> = ({
  refresh,
  balance,
  accountNumber,
}) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const modalRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);

  const initialValues: CommunityFormValues = {
    amount: balance || 0,
  };

  return (
    <ButtonModal
      id='withdraw-referral-rewards'
      buttonText='Withdraw'
      buttonClassName='btn btn-sm h-10 hover:bg-white bg-white text-primary p-2 rounded-lg font-medium text-sm'
      modalRef={modalRef}
      disableClose={loading}
      disablePadding
      className='w-full'
      autoHeight
    >
      <div className='border-b p-6'>
        <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
          Withdraw Referral Rewards
        </h3>
        <p className='text-[#999] text-sm -tracking-[0.1px]'>
          Withdraw your referral rewards
        </p>
      </div>

      <Formik<CommunityFormValues>
        initialValues={initialValues}
        validationSchema={yup.object({
          amount: yup
            .number()
            .required("Amount is required")
            .min(
              MIN_WITHDRAWAL_AMOUNT,
              `Amount must be at least ₦${MIN_WITHDRAWAL_AMOUNT}`
            )
            .max(balance, "Insufficient balance"),
        })}
        onSubmit={async (values, { setFieldError }) => {
          if (loading) return;
          if (!accountNumber) {
            setAlert({
              icon: "info",
              message: "Please add your account details to withdraw rewards",
              title: "Add Account details",
              buttonText: "Add Account details",
              buttonLink: "/talents/settings#bank-details",
            });
            return;
          }
          setLoading(true);
          toast.dismiss();

          try {
            const res = await requestWithdrawal(values.amount);

            if (res.success) {
              toast.success("Withdrawal request sent successfully");
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
            <FormikField
              name='amount'
              label='Amount'
              type='number'
              value={values.amount}
              error={errors.amount}
              touched={Boolean(touched.amount)}
            />

            <Button
              type='submit'
              color='primary'
              loading={loading}
              className='text-white mt-3 w-full'
            >
              {loading ? "Processing..." : "Withdraw"}
            </Button>
          </form>
        )}
      </Formik>
    </ButtonModal>
  );
};

export default WithdrawReferralRewards;
