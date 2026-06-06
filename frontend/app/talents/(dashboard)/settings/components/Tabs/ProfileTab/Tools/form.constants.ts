import * as yup from "yup";

import { FormField } from "@/app/common/types";

export const toolFormValidationSchema = yup.object().shape({
  name: yup.string().required().label("Name"),
  icon: yup.string().url().label("Icon"),
  category: yup.string().required().label("Category"),
});

export type TalentEducationFormValues = yup.InferType<
  typeof toolFormValidationSchema
>;

export const initialValues: TalentEducationFormValues = {
  name: "",
  icon: "",
  category: "",
};

export const toolFormFields: FormField<TalentEducationFormValues>[] = [
  {
    name: "name",
    label: "Tool Name",
  },
  {
    name: "category",
    label: "Category",
    type: "select",
  },
  {
    name: "icon",
    label: "Icon URL (optional)",
    type: "url",
  },
];
