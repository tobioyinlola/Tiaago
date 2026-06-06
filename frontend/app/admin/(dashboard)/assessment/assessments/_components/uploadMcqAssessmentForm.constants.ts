import * as Yup from "yup";

import { FormField } from "@/app/common/types";
import { getAssessmentDifficultyLevel } from "@/app/common/utils";

const difficultyLevels = ["Junior", "Intermediate", "Senior"];

export const uploadMcqAssessmentFormValidationSchema = Yup.object().shape({
  role: Yup.string().required().label("Role"),
  difficulty_level: Yup.string()
    .oneOf(difficultyLevels.map(dl => dl.toUpperCase()))
    .required()
    .label("Difficulty level"),
  duration_minutes: Yup.number()
    .min(1)
    .integer()
    .required()
    .label("Duration minutes"),
  name: Yup.string().required().label("Name"),
  description: Yup.string().required().label("Description"),
  file: Yup.string().required().label("File"),
});

export const uploadMcqAssessmentFormFields: FormField<UploadMcqAssessmentFormValues>[] =
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
      name: "role",
      label: "Role",
      type: "select",
    },
    {
      name: "difficulty_level",
      label: "Difficulty level",
      type: "select",
      selectFieldProps: {
        options: difficultyLevels.map(dl => ({
          label: getAssessmentDifficultyLevel(dl),
          value: dl.toUpperCase(),
        })),
      },
    },
    {
      name: "duration_minutes",
      label: "Duration minutes",
      type: "number",
    },
    {
      name: "file",
      type: "file",
      label: "File",
      fileFieldProps: {
        accept: ".csv, .xlsx",
        acceptText: "Must be a .xlsx or .csv file.",
      },
    },
  ];

export type UploadMcqAssessmentFormValues = Yup.InferType<
  typeof uploadMcqAssessmentFormValidationSchema
>;

export const uploadMcqAssessmentFormInitialValues: UploadMcqAssessmentFormValues =
  {
    name: "",
    description: "",
    role: "",
    difficulty_level: "",
    duration_minutes: 0,
    file: "",
  };
