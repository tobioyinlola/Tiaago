import * as Yup from "yup";

import { FormField } from "@/app/common/types";
import { passwordValidationSchema } from "@/app/common/constants/validationSchemas";

export const changePasswordSchema = Yup.object().shape({
  currentPassword: Yup.string().required().label("current password"),
  new_password1: passwordValidationSchema,
  new_password2: Yup.string()
    .label("Confirm Password")
    .oneOf([Yup.ref("new_password1")], "Passwords must match")
    .required(),
});

export type ChangePasswordValues = Yup.InferType<typeof changePasswordSchema>;

export const changePasswordInitialValues: ChangePasswordValues = {
  currentPassword: "",
  new_password1: "",
  new_password2: "",
};

export const changePasswordFields: FormField<ChangePasswordValues>[] = [
  {
    name: "currentPassword",
    label: "Current Password",
    type: "password",
  },
  {
    name: "new_password1",
    label: "New Password",
    type: "password",
  },
  {
    name: "new_password2",
    label: "Confirm Password",
    type: "password",
  },
];
