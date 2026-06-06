import * as Yup from "yup";

import { FormField } from "@/app/common/types";

export const createCodeAssessmentFormValidationSchema = Yup.object().shape({
  stack: Yup.number().min(1).integer().required().label("Stack"),
  name: Yup.string().required().label("Name"),
  description: Yup.string().required().label("Description"),
  duration_minutes: Yup.number()
    .min(1)
    .integer()
    .required()
    .label("Duration minutes"),
});

export const createCodeAssessmentFormFields: FormField<CreateCodeAssessmentFormValues>[] =
  [
    {
      name: "name",
      label: "Name",
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
    },
    {
      name: "stack",
      label: "Stack",
      type: "select",
    },
    {
      name: "duration_minutes",
      label: "Duration minutes",
      type: "number",
    },
  ];

export type CreateCodeAssessmentFormValues = Yup.InferType<
  typeof createCodeAssessmentFormValidationSchema
>;
