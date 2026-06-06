import { FormField } from "@/app/common/types";
import * as yup from "yup";

export const communityFormFields: FormField[] = [
  {
    name: "name",
    type: "text",
    label: "Community Name",
    placeholder: "Enter community name",
  },
  {
    name: "description",
    type: "textarea",
    label: "Description",
    placeholder: "Enter community description (optional)",
  },
];

export const communityFormValidationSchema = yup.object({
  name: yup
    .string()
    .required("Community name is required")
    .min(1, "Community name must be at least 1 character")
    .max(100, "Community name cannot exceed 100 characters"),
  description: yup
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
});
