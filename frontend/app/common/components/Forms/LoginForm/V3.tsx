"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Formik } from "formik";
import { AxiosError } from "axios";

import {
  cn,
  getFullUserType,
  handleFormSubmissionError,
} from "@/app/common/utils";

import {
  loginFormFields,
  loginInitialValues,
  loginValidationSchema,
} from "./form.constants";

import { Ias } from ".";
import { Button } from "react-daisyui";
import FormikField from "../FormikField";
import { User } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { setAuthCookies, TokensInput } from "@/app/common/actions";
import { publicAxiosInstance } from "@/app/common/utils/axios.instance";

type LoginSuccessResponse = TokensInput & {
  user: User;
};

const LoginForm = ({ as = "startup", next }: { as?: Ias; next?: string }) => {
  const setAlert = useAlert(state => state.setAlert);
  const opposite: Ias = as === "startup" ? "talent" : "startup";
  const forgotPasswordHref =
    as === "staff" ? "/admin/forgot-password" : `/${as}s/forgot-password`;

  const onLoginSuccess = async (
    tokensInput?: TokensInput,
    userType?: User["user_type"]
  ) => {
    toast.success("Login successful");
    if (tokensInput) await setAuthCookies(tokensInput);
    setTimeout(() => {
      // window.location.reload();
      if (next) {
        window.location.href = next;
      } else {
        const _as = userType ? getFullUserType(userType) : as;
        if (_as === "staff") window.location.href = "/admin";
        else window.location.href = `/${_as}s/dashboard`;
      }
    }, 500);
  };

  return (
    <div>
      <div className='flex items-center justify-center'>
        <hr className='w-full bg-[#F0F2F5]' />
        <span className='bg-white px-2 font-onest text-sm text-[#667185]'>
          Or
        </span>
        <hr className='w-full bg-[#F0F2F5]' />
      </div>

      <button className='flex items-center gap-4 border-[1.5px] border-[#D0D5DD] w-full py-4 justify-center rounded-md my-8 text-base font-onest font-semibold shadow-[0px_2px_4px_0px_#00000014]'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='20'
          height='20'
          viewBox='0 0 17 17'
          fill='none'
        >
          <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M16.6605 8.68183C16.6605 8.11456 16.6096 7.56911 16.515 7.04547H8.98047V10.14H13.2859C13.1005 11.14 12.5368 11.9873 11.6896 12.5546V14.5618H14.275C15.7877 13.1691 16.6605 11.1182 16.6605 8.68183Z'
            fill='#4285F4'
          />
          <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M8.98112 16.5C11.1411 16.5 12.952 15.7837 14.2757 14.5618L11.6902 12.5546C10.9738 13.0346 10.0575 13.3182 8.98112 13.3182C6.89749 13.3182 5.13385 11.9109 4.50476 10.02H1.83203V12.0927C3.14839 14.7073 5.85385 16.5 8.98112 16.5Z'
            fill='#34A853'
          />
          <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M4.5041 10.02C4.3441 9.54002 4.2532 9.02729 4.2532 8.50002C4.2532 7.97274 4.3441 7.46002 4.5041 6.98001V4.90729H1.83138C1.28956 5.98729 0.980469 7.20911 0.980469 8.50002C0.980469 9.79092 1.28956 11.0127 1.83138 12.0927L4.5041 10.02Z'
            fill='#FBBC05'
          />
          <path
            fillRule='evenodd'
            clipRule='evenodd'
            d='M8.98112 3.68182C10.1557 3.68182 11.2102 4.08545 12.0393 4.87818L14.3338 2.58364C12.9484 1.29273 11.1375 0.5 8.98112 0.5C5.85385 0.5 3.14839 2.29273 1.83203 4.90727L4.50476 6.98C5.13385 5.08909 6.89749 3.68182 8.98112 3.68182Z'
            fill='#EA4335'
          />
        </svg>
        Sign in with Google
      </button>

      <Formik
        initialValues={loginInitialValues}
        onSubmit={(values, { setSubmitting, resetForm, setFieldError }) => {
          toast.dismiss();
          new Promise<LoginSuccessResponse>(async (resolve, reject) => {
            try {
              const { data } =
                await publicAxiosInstance.post<LoginSuccessResponse>(
                  "/auth/login/",
                  values
                );
              resolve(data);
            } catch (err) {
              reject(err);
            }
          })
            .then(({ user, ...tokensInput }) => {
              setSubmitting(false);
              resetForm();
              onLoginSuccess(tokensInput, user?.user_type);
            })
            .catch((err: AxiosError) => {
              let errorMsg = handleFormSubmissionError(
                err,
                setFieldError,
                setAlert
              );
              setSubmitting(false);
              if (errorMsg === "E-mail is not verified.")
                setAlert({
                  title: "Email not verified",
                  message: "Please verify your email to continue",
                  icon: "info",
                  buttonText: "Resend Verification Email",
                  buttonAction: () =>
                    publicAxiosInstance
                      .post("/auth/resend-email/", {
                        email: values.email,
                      })
                      .then(() => {
                        toast.success("Verification email sent successfully", {
                          important: true,
                        });
                      })
                      .catch(e => {
                        setTimeout(() => {
                          handleFormSubmissionError(e, undefined, setAlert);
                        }, 500);
                      }),
                  secondaryButton: {
                    text: "Close",
                    action: () => setAlert(undefined),
                  },
                });
            });
        }}
        validationSchema={loginValidationSchema}
      >
        {({ handleSubmit, isSubmitting, errors, touched, values }) => (
          <form className='flex flex-col gap-2' onSubmit={handleSubmit}>
            {loginFormFields.map(({ name, type, label, ...props }, i) => (
              <FormikField
                key={name}
                {...{ name, label, type, ...props }}
                autoFocus={i === 0}
                value={values[name]}
                error={errors[name]}
                touched={touched[name]}
                disablePasswordHelpers
                inputContainerClassName='min-h-10 h-10'
              />
            ))}
            <div className='w-full flex justify-center my-6'>
              <p className='font-onest text-sm text-[#5F6264]'>
                Forgot password?{" "}
                <Link
                  className='text-primary hover:underline'
                  href={forgotPasswordHref}
                >
                  Recover
                </Link>
              </p>
            </div>
            <Button
              loading={isSubmitting}
              color='primary'
              type='submit'
              className='mb-6 font-semibold text-base'
              disabled
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </form>
        )}
      </Formik>
      <p className='text-center font-onest text-sm text-[#5E6163]'>
        Click{" "}
        <Link
          href={`/${opposite}s/signin${next ? `?next=${next}` : ""}`}
          className='text-primary hover:underline'
        >
          here
        </Link>{" "}
        to log in as a{" "}
        <span className='capitalize'>
          {opposite === "startup" ? "Recruiter" : "Talent"}
        </span>{" "}
        instead
      </p>
    </div>
  );
};

export default LoginForm;
