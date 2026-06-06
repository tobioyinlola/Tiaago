import * as Yup from "yup";
import { IoPersonSharp } from "react-icons/io5";

import {
  richtextValidationSchema,
  urlValidationSchema,
} from "@/app/common/constants/validationSchemas";
import { Talent, FormField } from "@/app/common/types";

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
    leftIcon: <IoPersonSharp className='text-base text-[#98A2B3]' />,
  },
  {
    name: "last_name",
    label: "Last name",
    className: "md:w-[48%] [&_input]:w-full",
    leftIcon: <IoPersonSharp className='text-base text-[#98A2B3]' />,
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
  profile: Talent | null
): PersonalInfoFormValues => ({
  first_name: profile?.first_name ?? "",
  last_name: profile?.last_name ?? "",
  phone_number: profile?.phone_number ?? "234",
  country: profile?.country ?? "",
});

export const profilePictureValidationSchema = Yup.object().shape({
  profile_pic: Yup.string().required().label("Profile picture"),
});

export const getBioAndPortfolioValidationSchema = (maxChars = 255) =>
  Yup.object().shape({
    bio: richtextValidationSchema(maxChars, "Bio"),
    portfolio: urlValidationSchema.label("Portfolio link"),
  });
