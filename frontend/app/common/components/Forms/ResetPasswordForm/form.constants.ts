import { InferType } from "yup";

import { FormField } from "@/app/common/types";
import { setPasswordValidationSchema } from "@/app/common/constants/validationSchemas";

export const resetPasswordValidationSchema = setPasswordValidationSchema;

export type ResetPasswordFormValues = InferType<
  typeof resetPasswordValidationSchema
>;

export const resetPasswordInitialValues: ResetPasswordFormValues = {
  password1: "",
  password2: "",
};

export const resetPasswordFormFields: FormField<ResetPasswordFormValues>[] = [
  {
    name: "password1",
    label: "Password",
    type: "password",
  },
  {
    name: "password2",
    label: "Confirm Password",
    type: "password",
  },
];
