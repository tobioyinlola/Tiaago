import * as yup from "yup";

import { jobTypeEnumToLabel } from "@/app/common/utils";
import { FormField, TalentPortfolioWorkExperience } from "@/app/common/types";

export const workExperienceFormValidationSchema = yup.object().shape({
  company_name: yup.string().required().label("Company Name"),
  company_logo_url: yup.string().url().label("Company Logo URL"),
  title: yup.string().required().label("Job Title"),
  start_date: yup.string().required().label("Start Date"),
  end_date: yup.string().label("End Date"),
  employment_type: yup
    .string()
    .required()
    .label("Job type")
    .oneOf<TalentPortfolioWorkExperience["employment_type"]>(
      ["FT", "PT", "CW", "IN"],
      "Invalid type selected"
    ),
});

export type WorkExperienceFormValues = yup.InferType<
  typeof workExperienceFormValidationSchema
>;

export const initialValues: WorkExperienceFormValues = {
  company_name: "",
  company_logo_url: "",
  title: "",
  start_date: "",
  end_date: "",
  // @ts-ignore
  employment_type: "",
};

export const workExperienceFormFields: FormField<WorkExperienceFormValues>[] = [
  {
    name: "company_name",
    label: "Company Name",
  },
  {
    name: "company_logo_url",
    label: "Company Logo URL (optional)",
    type: "url",
  },
  {
    name: "title",
    label: "Job Title",
  },
  {
    name: "employment_type",
    label: "Job Type",
    type: "select",
    selectFieldProps: {
      options: ["FT", "PT", "CW", "IN"].map(t => ({
        // @ts-ignore
        label: jobTypeEnumToLabel(t),
        value: t,
      })),
    },
  },
  {
    name: "start_date",
    label: "Start Date",
    className: "md:w-[48%] [&_input]:w-full",
    type: "date",
  },
  {
    name: "end_date",
    label: "End Date (optional)",
    className: "md:w-[48%] [&_input]:w-full",
    type: "date",
  },
];
