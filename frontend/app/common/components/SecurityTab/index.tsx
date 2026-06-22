"use client";

import { toast } from "sonner";
import { Formik } from "formik";
import Button from "@/app/common/components/DaisyButton";
import { CheckCircle2 } from "lucide-react";

import {
  changePasswordFields,
  changePasswordInitialValues,
  changePasswordSchema,
} from "./changePasswordForm";
import { useAlert } from "../../store/useAlert";
import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { handleFormSubmissionError } from "../../utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import { GoogleIcon } from "@/app/common/icons/GoogleIcon";
import { useUserStore } from "@/app/common/store/useUser";

const SecurityTab = () => {
  const setAlert = useAlert(state => state.setAlert);
  const profile = useUserStore(s => s.profile);
  const isGoogleUser = profile?.auth_provider === "google";

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <div className="p-5 rounded-lg border border-gray-200">
        <div className="border-b border-outline pb-5">
          <h2 className="text-gray-900 text-base font-bold">
            Password and Security
          </h2>
          <p className="text-sm text-gray-500">
            Make changes to your password, you&apos;ll have to login again after
            the password is changed
          </p>
        </div>

        <Formik
          initialValues={changePasswordInitialValues}
          validationSchema={changePasswordSchema}
          onSubmit={(
            { currentPassword, ...values },
            { resetForm, setFieldError, setSubmitting }
          ) => {
            new Promise(async (resolve, reject) => {
              try {
                toast.dismiss();
                const data = await clientKyInstance
                  .post("/auth/password/change/", { json: values })
                  .json();
                resolve(data);
              } catch (err) {
                reject(err);
              }
            })
              .then(() => {
                setSubmitting(false);
                resetForm();
                toast.success("Password changed successfully");
              })
              .catch(err => handleFormSubmissionError(err, setFieldError, setAlert))
              .finally(() => setSubmitting(false));
          }}
        >
          {({ handleSubmit, isSubmitting, errors, touched, values }) => (
            <form
              onSubmit={handleSubmit}
              className="my-8 max-w-md max-md:mx-auto"
            >
              {changePasswordFields.map(({ name, type, label }) => (
                <FormikField
                  key={name}
                  {...{ name, label, type }}
                  value={values[name]}
                  error={errors[name]}
                  touched={touched[name]}
                  disablePasswordHelpers={name !== "new_password1"}
                />
              ))}
              <Button
                loading={isSubmitting}
                variant="outline"
                size="sm"
                className="w-fit max-md:mx-auto border-gray-300 text-gray-700"
                type="submit"
              >
                Change password
              </Button>
            </form>
          )}
        </Formik>
      </div>

      {/* Connected Accounts */}
      <div className="p-5 rounded-lg border border-gray-200">
        <div className="border-b border-outline pb-5">
          <h2 className="text-gray-900 text-base font-bold">
            Connected Accounts
          </h2>
          <p className="text-sm text-gray-500">
            Manage your sign-in methods and connected services
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {/* Google Account */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-border shadow-sm">
                <GoogleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">Google</p>
                {isGoogleUser ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">
                      Connected as {profile?.email}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Not connected
                  </p>
                )}
              </div>
            </div>
            {isGoogleUser && (
              <span className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Active
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityTab;
