import * as Yup from "yup";
import { IoBriefcase, IoLockClosed, IoMail, IoPersonSharp } from "react-icons/io5";

import {
  setPasswordValidationSchema,
  emailValidationSchema,
  urlValidationSchema,
  richtextValidationSchema,
  passwordValidationSchema,
} from "@/app/common/constants/validationSchemas";

import { FormField } from "@/app/common/types";

export const genderOptions = [
  {
    label: "Male",
    value: "M",
  },
  {
    label: "Female",
    value: "F",
  },
];

export const talentDetailsValidationSchema = Yup.object().shape({
  first_name: Yup.string().required().label("First name"),
  last_name: Yup.string().required().label("Last name"),
  email: emailValidationSchema.label("Email address"),
  phone_number: Yup.string().required().label("Phone number"),
  country: Yup.string().required().label("Country"),
  gender: Yup.string()
    .oneOf(genderOptions.map(g => g.value))
    .required()
    .label("Gender"),
  bio: richtextValidationSchema(255, "Bio"),
});

type TalentDetailsFormValues = Yup.InferType<
  typeof talentDetailsValidationSchema
>;

export const talentDetailsFormFields: FormField<TalentDetailsFormValues>[] = [
  {
    name: "first_name",
    label: "First name",
    className: "md:w-[48%] [&_input]:w-full",
  },
  {
    name: "last_name",
    label: "Last name",
    className: "md:w-[48%] [&_input]:w-full",
  },
  {
    name: "email",
    label: "Email Address",
    type: "email",
  },
  {
    name: "phone_number",
    label: "Phone Number",
    type: "tel",
  },
  {
    name: "country",
    label: "Country",
  },
  {
    name: "gender",
    label: "Gender",
    type: "select",
    selectFieldProps: {
      options: genderOptions,
    },
  },
  {
    name: "bio",
    label: "Bio",
    type: "richtext",
    placeholder: "Tell us about yourself",
  },
];

export const talentDetailsInitialFormValues: TalentDetailsFormValues = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "234",
  country: "",
  gender: "",
  bio: "",
};

export const experienceLevelOptions = [
  "Junior (0-3 years)",
  "Intermediate (3-5 years)",
  "Expert (5+ years)",
].map(l => ({
  label: l,
  value: l,
}));

export const talentQualificationsValidationSchema = Yup.object().shape({
  role: Yup.string().required().label("Roles"),
  experience_level: Yup.string()
    .oneOf(experienceLevelOptions.map(g => g.value))
    .required()
    .label("Experience level"),
  portfolio: urlValidationSchema.label("Portfolio link"),
  resume: Yup.string().required().label("Resume"),
});

type TalentQualificationsFormValues = Yup.InferType<
  typeof talentQualificationsValidationSchema
>;

export const talentQualificationsFormFields: FormField<TalentQualificationsFormValues>[] =
  [
    {
      name: "role",
      label: "What type of role are you looking for?",
      type: "select",
    },
    {
      name: "experience_level",
      label: "Select Experience Level",
      type: "select",
      selectFieldProps: {
        options: experienceLevelOptions,
      },
    },
    {
      name: "portfolio",
      label: "Link to Portfolio (Github, Behance etc)",
      type: "url",
    },
    {
      name: "resume",
      label: "Upload your resume",
      type: "file",
    },
  ];

export const talentQualificationsInitialFormValues: TalentQualificationsFormValues =
  {
    role: "",
    experience_level: "",
    portfolio: "",
    resume: "",
  };

export type ChoosePasswordFormValues = Yup.InferType<
  typeof setPasswordValidationSchema
>;

export const choosePasswordFormFields: FormField<ChoosePasswordFormValues>[] = [
  {
    name: "password1",
    label: "Password",
    type: "password",
  },
  {
    name: "password2",
    label: "Confirm password",
    type: "password",
  },
];

export const choosePasswordInitialFormValues: ChoosePasswordFormValues = {
  password1: "",
  password2: "",
};

export const initialValues = {
  ...talentDetailsInitialFormValues,
  ...talentQualificationsInitialFormValues,
  ...choosePasswordInitialFormValues,
};

export const allFields = [
  ...talentDetailsFormFields,
  ...talentQualificationsFormFields,
  ...choosePasswordFormFields,
];

export const recruiterSignupformSteps = [
  {
    title: "Talent's Details",
    description: "Please provide the following information about yourself",
    validationSchema: talentDetailsValidationSchema,
    fieldNames: talentDetailsFormFields.map(f => f.name),
  },
  {
    title: "Talent's Qualification",
    description: "Kindly share with us your qualifications",
    validationSchema: talentQualificationsValidationSchema,
    fieldNames: talentQualificationsFormFields.map(f => f.name),
  },
  {
    title: "Choose Password",
    description: "Choose a secure password for your account",
    validationSchema: setPasswordValidationSchema,
    fieldNames: choosePasswordFormFields.map(f => f.name),
  },
];

// v3

export const talentSignUpV3ValidationSchema = Yup.object().shape({
  full_name: Yup.string().required().label("Full name"),
  email: emailValidationSchema.label("Email address"),
  country: Yup.string().required().label("Country"),
  role: Yup.string().required().label("Role"),
  password1: passwordValidationSchema,
});

type TalentSignupV3FormValues = Yup.InferType<
  typeof talentSignUpV3ValidationSchema
>;

export const talentSignUpV3FormFields: FormField<TalentSignupV3FormValues>[] = [
  {
    name: "full_name",
    label: "Full name",
    leftIcon: <IoPersonSharp className='text-base text-[#98A2B3]' />,
    placeholder: "Scott Owens",
  },
  {
    name: "email",
    label: "Email address",
    type: "email",
    leftIcon: <IoMail className='text-base text-[#98A2B3]' />,
    placeholder: "scottowens@gmail.com",
  },
  {
    name: "country",
    label: "Country",
  },
  {
    name: "role",
    label: "Role",
    leftIcon: <IoBriefcase className='text-base text-[#98A2B3]' />,
    placeholder: "e.g., Frontend Engineer",
  },
  {
    name: "password1",
    label: "Password",
    type: "password",
    leftIcon: <IoLockClosed className='text-base text-[#98A2B3]' />,
    placeholder: "********",
  },
  // {
  //   name: "password2",
  //   label: "Confirm password",
  //   type: "password",
  //   leftIcon: <IoLockClosed className='text-base text-[#98A2B3]' />,
  //   placeholder: "********",
  // },
];

export const talentSignUpV3InitialFormValues: TalentSignupV3FormValues = {
  full_name: "",
  email: "",
  country: "",
  role: "",
  password1: "",
  // password2: "",
};
