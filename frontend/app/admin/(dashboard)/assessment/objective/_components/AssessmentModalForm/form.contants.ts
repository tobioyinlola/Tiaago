import * as yup from "yup";

import { FormField } from "@/app/common/types";

export const assessmentFormValidationSchema = yup.object().shape({
  name: yup.string().required().label("Name"),
  description: yup.string().required().label("Description"),
  questions_on: yup.array().required().label("Questions on").min(1),
  roles: yup.array().required().label("Roles").min(1),
  minutes: yup
    .number()
    .required()
    .label("Minutes")
    .min(3, "Minimum of 3 minutes"),
  question_count: yup.number().required().label("Question count"),
});

export type AssessmentFormValues = yup.InferType<
  typeof assessmentFormValidationSchema
>;

export const initialValues: AssessmentFormValues = {
  name: "",
  description: "",
  questions_on: [],
  roles: [],
  minutes: 3,
  question_count: 0,
};

export const assessmentFormFields: FormField<AssessmentFormValues>[] = [
  {
    name: "name",
    label: "Name",
    type: "text",
  },
  {
    name: "description",
    label: "Description",
    type: "text",
  },
  {
    name: "questions_on",
    label: "Questions on",
    type: "select",
    selectFieldProps: {
      createable: true,
      isMulti: true,
    },
  },
  {
    name: "roles",
    label: "Roles",
    type: "select",
    selectFieldProps: {
      isMulti: true,
    },
  },
  {
    name: "minutes",
    label: "Minutes",
    type: "number",
  },
  {
    name: "question_count",
    label: "Question count",
    type: "number",
  },
];
