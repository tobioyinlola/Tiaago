import { object, InferType, string } from "yup";
import { IoMail, IoLockClosed } from "react-icons/io5";

import { FormField } from "@/app/common/types";
import { emailValidationSchema } from "@/app/common/constants/validationSchemas";

export const loginValidationSchema = object().shape({
  email: emailValidationSchema,
  password: string().label("Password").required(),
});

export type LoginFormValues = InferType<typeof loginValidationSchema>;

export const loginInitialValues: LoginFormValues = {
  email: "",
  password: "",
};

export const loginFormFields: FormField<LoginFormValues>[] = [
  {
    name: "email",
    label: "Email address",
    type: "email",
    leftIcon: <IoMail className='text-base text-[#98A2B3]' />,
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    leftIcon: <IoLockClosed className='text-base text-[#98A2B3]' />,
  },
];
