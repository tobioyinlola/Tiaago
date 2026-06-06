"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Formik } from "formik";
import { AxiosError } from "axios";
import { Button } from "react-daisyui";

import {
  loginFormFields,
  loginInitialValues,
  loginValidationSchema,
} from "./form.constants";
import { useAlert } from "@/app/common/store/useAlert";
import { BasePageProps, User } from "@/app/common/types";
import axiosInstance from "@/app/common/utils/axios.instance";
import { getFullUserType, handleFormSubmissionError } from "@/app/common/utils";
import { TokensInput, setAuthCookies } from "@/app/common/actions";
import FormikField from "@/app/common/components/Forms/FormikField";

export type Ias = BasePageProps["as"];
type LoginSuccessResponse = TokensInput & {
  user: User;
};

const LoginForm = ({ as = "startup" }: { as?: Ias }) => {
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
      const _as = userType ? getFullUserType(userType) : as;
      if (_as === "staff") window.location.href = "/admin";
      else window.location.href = `/${_as}s/dashboard`;
    }, 500);
  };
  return (
    <Formik
      initialValues={loginInitialValues}
      onSubmit={(values, { setSubmitting, resetForm, setFieldError }) => {
        new Promise<LoginSuccessResponse>(async (resolve, reject) => {
          toast.dismiss();
          try {
            const { data } = await axiosInstance.post<LoginSuccessResponse>(
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
                  axiosInstance
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
        <form onSubmit={handleSubmit} className='my-8'>
          {loginFormFields.map(({ name, type, label, ...props }, i) => (
            <FormikField
              key={name}
              {...{ name, label, type, ...props }}
              autoFocus={i === 0}
              value={values[name]}
              error={errors[name]}
              touched={touched[name]}
              disablePasswordHelpers
            />
          ))}
          <div className='mt-2 w-full flex justify-end'>
            <Link
              className='text-[#FF4A4A] text-sm hover:underline'
              href={forgotPasswordHref}
            >
              Forgot password?
            </Link>
          </div>
          <Button
            loading={isSubmitting}
            color='primary'
            className='text-white w-full my-8'
            type='submit'
          >
            {isSubmitting ? (
              "Logging in..."
            ) : (
              <>
                Login in as a <span className='capitalize'>{as}</span>
              </>
            )}
          </Button>
          {as !== "staff" && (
            <p className='text-[#343A40] text-base text-center'>
              Click{" "}
              <Link
                className='text-primary hover:underline'
                href={`/${opposite}s/signin`}
              >
                here
              </Link>{" "}
              to log in as a <span className='capitalize'>{opposite}</span>{" "}
              instead
            </p>
          )}
        </form>
      )}
    </Formik>
  );
};

export default LoginForm;
