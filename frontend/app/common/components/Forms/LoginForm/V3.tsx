"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Formik } from "formik";
import { HTTPError } from "ky";

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
import Button from "@/app/common/components/DaisyButton";
import FormikField from "../FormikField";
import { User } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { setAuthCookies, TokensInput } from "@/app/common/actions";
import { publicKyInstance } from "@/app/common/utils/client-ky.instance";
import GoogleSignInButton from "@/app/common/components/GoogleSignInButton";

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

      {as !== "staff" && (
        <GoogleSignInButton
          userType={as === "talent" ? "talent" : "company"}
          next={next}
        />
      )}

      <Formik
        initialValues={loginInitialValues}
        onSubmit={(values, { setSubmitting, resetForm, setFieldError }) => {
          toast.dismiss();
          new Promise<LoginSuccessResponse>(async (resolve, reject) => {
            try {
              const data = await publicKyInstance
                .post("/auth/login/", { json: values })
                .json<LoginSuccessResponse>();
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
            .catch((err: HTTPError) => {
              let errorMsg = handleFormSubmissionError(
                err,
                setFieldError,
                setAlert
              );
              setSubmitting(false);
              if (errorMsg === "E-mail is not verified.") {
                publicKyInstance
                  .post("/auth/resend-otp/", { json: { email: values.email } })
                  .catch(() => {});
                const params = new URLSearchParams({ email: values.email, as });
                if (next) params.set("next", next);
                window.location.href = `/verify-email?${params.toString()}`;
              }
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
              disabled={isSubmitting}
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
