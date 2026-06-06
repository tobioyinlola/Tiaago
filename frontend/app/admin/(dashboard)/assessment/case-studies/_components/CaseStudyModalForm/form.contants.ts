import * as yup from "yup";

import { FormField } from "@/app/common/types";

export const caseStudyFormValidationSchema = yup.object().shape({
  title: yup.string().required().label("Name"),
  about: yup.string().required().label("Description"),
  roles: yup
    .array()
    .of(yup.number().required())
    .required()
    .label("Questions on")
    .min(1),
});

export type AssessmentFormValues = yup.InferType<
  typeof caseStudyFormValidationSchema
>;

export const initialValues: AssessmentFormValues = {
  title: "",
  about: "",
  roles: [],
};

export const caseStudyFormFields: FormField<AssessmentFormValues>[] = [
  {
    name: "title",
    label: "Name",
    type: "text",
  },
  {
    name: "about",
    label: "Description",
    type: "richtext",
  },
  {
    name: "roles",
    label: "Questions on",
    type: "select",
    selectFieldProps: {
      isMulti: true,
    },
  },
];
