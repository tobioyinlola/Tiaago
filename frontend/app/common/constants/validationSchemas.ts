import * as Yup from "yup";
import { htmlToPlainText } from "../utils";

export const passwordValidationSchema = Yup.string()
  .label("Password")
  .min(8)
  .matches(/[a-z]/, "Password must contain at least one lowercase character")
  .matches(/[A-Z]/, "Password must contain at least one uppercase character")
  .matches(/[0-9]/, "Password must contain at least one number")
  .test(
    "specialChars",
    "Password must contain at least one special character",
    val => !!val && !/^[A-Za-z0-9 ]+$/.test(val)
  )
  .required();

export const emailValidationSchema = Yup.string()
  .label("Email address")
  .email()
  .required();

export const urlValidationSchema = Yup.string()
  .matches(
    /^((ftp|http|https):\/\/)?(www\.)?(?!.*(ftp|http|https|www\.))([a-zA-Z0-9-]+(\.[a-zA-Z]+)+)((\/[\w-]+)*)(\/\w+\?[a-zA-Z0-9_]+=\w+(&[a-zA-Z0-9_]+=\w+)*)?\/?$/gm,
    "Please enter a valid URL"
  )
  .required();

export const confirmPasswordValidationSchema = Yup.string()
  .label("Confirm Password")
  .oneOf([Yup.ref("password1")], "Passwords must match")
  .required();

export const setPasswordValidationSchema = Yup.object().shape({
  password1: passwordValidationSchema,
  password2: confirmPasswordValidationSchema,
});

export const richtextValidationSchema = (
  maxChars: number,
  label: string,
  minChars = 3
) =>
  Yup.string()
    .required()
    .test(
      "plainTextMaxLength",
      `${label} must be at most ${maxChars} characters`,
      html => (maxChars ? htmlToPlainText(html).length <= maxChars : true)
    )
    .test(
      "plainTextMinLength",
      `${label} must be at least 3 characters`,
      html => htmlToPlainText(html).length >= minChars
    )
    .label(label);
