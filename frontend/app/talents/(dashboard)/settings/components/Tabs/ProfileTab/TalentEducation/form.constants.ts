import * as yup from "yup";

import { FormField } from "@/app/common/types";

export const educationFormValidationSchema = yup.object().shape({
  school: yup.string().required().label("School"),
  degree: yup.string().required().label("Degree"),
  program: yup.string().required().label("Program"),
  start_date: yup.string().required().label("Start Date"),
  end_date: yup.string().required().label("End Date"),
});

export type TalentEducationFormValues = yup.InferType<
  typeof educationFormValidationSchema
>;

export const initialValues: TalentEducationFormValues = {
  school: "",
  degree: "",
  program: "",
  start_date: "",
  end_date: "",
};

export const educationFormFields: FormField<TalentEducationFormValues>[] = [
  {
    name: "school",
    label: "School",
  },
  {
    name: "degree",
    label: "Degree",
  },
  {
    name: "program",
    label: "Program",
  },
  {
    name: "start_date",
    label: "Start Date",
    className: "md:w-[48%] [&_input]:w-full",
    type: "year",
  },
  {
    name: "end_date",
    label: "End Date",
    className: "md:w-[48%] [&_input]:w-full",
    type: "year",
  },
];
