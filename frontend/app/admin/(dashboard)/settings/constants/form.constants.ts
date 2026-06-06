import * as Yup from "yup";

import { Staff, FormField } from "@/app/common/types";
import { richtextValidationSchema } from "@/app/common/constants/validationSchemas";

export const personalInfoValidationSchema = Yup.object().shape({
  first_name: Yup.string().required().label("First name"),
  last_name: Yup.string().required().label("Last name"),
  phone_number: Yup.string().required().label("Phone number"),
  country: Yup.string().required().label("Country"),
});

type PersonalInfoFormValues = Yup.InferType<
  typeof personalInfoValidationSchema
>;

export const personalInfoFormFields: FormField<PersonalInfoFormValues>[] = [
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
    name: "phone_number",
    type: "tel",
    label: "Phone Number",
    className: "lg:w-[48%]",
  },
  {
    name: "country",
    label: "Country",
    className: "lg:w-[48%]",
  },
];

export const getPersonalInfoInitiaValues = (
  profile: Staff | null
): PersonalInfoFormValues => ({
  first_name: profile?.first_name ?? "",
  last_name: profile?.last_name ?? "",
  phone_number: profile?.phone_number ?? "234",
  country: profile?.country ?? "",
});

export const profilePictureValidationSchema = Yup.object().shape({
  profile_pic: Yup.string().required().label("Profile picture"),
});

export const getBioValidationSchema = (maxChars = 255) =>
  Yup.object().shape({
    bio: richtextValidationSchema(maxChars, "Bio"),
  });
