import * as yup from "yup";

import { FormField } from "@/app/common/types";

export const projectFormValidationSchema = yup.object().shape({
  name: yup.string().required().label("Project Title"),
  image: yup.string().url().required().label("Project Image"),
  link: yup.string().url().required().label("Project Link"),
});

export type ProjectFormValues = yup.InferType<
  typeof projectFormValidationSchema
>;

export const initialValues: ProjectFormValues = {
  name: "",
  image: "",
  link: "",
};

export const projectFormFields: FormField<ProjectFormValues>[] = [
  {
    name: "name",
    label: "Project Title",
  },
  {
    name: "image",
    label: "Project Image URL",
    type: "url",
  },
  {
    name: "link",
    label: "Project Link URL",
    type: "url",
  },
];
