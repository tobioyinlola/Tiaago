import * as Yup from "yup";

import { FormField, Job, RichTextToolbar } from "@/app/common/types";
import {
  handlePlural,
  jobSalaryTypeToLabel,
  jobTypeEnumToLabel,
} from "@/app/common/utils";
import { richtextValidationSchema } from "@/app/common/constants/validationSchemas";
import { WORK_TYPE_OPTIONS } from "@/app/common/constants/talent-network";
import {
  JOB_LEVEL_OPTIONS,
  JOB_LEVEL_VALUES,
} from "@/app/common/constants/jobs";

/** Quill toolbar for the job posting rich-text fields only (job requirement,
 * job description, about company). Keeps the header dropdown, links, lists and
 * clear-formatting, and deliberately drops bold/italic/underline and the rest
 * of the character-level formatting so posted jobs stay visually consistent.
 * Other rich-text fields in the app (talent bio, cover letter) don't pass a
 * toolbar and keep Quill's full default one. */
export const jobPostingRichTextToolbar: RichTextToolbar = [
  [{ header: [false] }],
  ["link"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["clean"],
];

export const jobBasicDetailsValidationSchema = Yup.object().shape({
  role: Yup.string().required().label("Job title/position"),
  job_type: Yup.string()
    .required()
    .label("Job type")
    .oneOf<Job["job_type"]>(
      ["FT", "PT", "CW", "IN"],
      "Please select a valid job type"
    ),
  job_level: Yup.string()
    .required()
    .label("Job level")
    .oneOf(JOB_LEVEL_VALUES, "Please select a valid job level"),
  salary_duration: Yup.string().required().label("Payment type"),
  payment_range: Yup.string().required().label("Payment range"),
  payment_currency: Yup.string().required().label("Currency"),
  experience: Yup.number().required().min(0).label("Experience"),
  work_mode: Yup.string().label("Work mode"),
  country: Yup.string().label("Country"),
});

export const companyDescriptionValidationSchema = Yup.object().shape({
  about_company: richtextValidationSchema(1000, "Company description"),
});

export const jobRequirementValidationSchema = Yup.object().shape({
  job_requirement: richtextValidationSchema(1000, "Job requirements"),
});

export const jobDescriptionValidationSchema = Yup.object().shape({
  description: richtextValidationSchema(1000, "Job description"),
});

type JobBasicDetailsFormValues = Yup.InferType<
  typeof jobBasicDetailsValidationSchema
>;
type CompanyDescriptionFormValues = Yup.InferType<
  typeof companyDescriptionValidationSchema
>;
type JobRequirementFormValues = Yup.InferType<
  typeof jobRequirementValidationSchema
>;
type JobDescriptionFormValues = Yup.InferType<
  typeof jobDescriptionValidationSchema
>;

export const jobBasicDetailsFormFields: FormField<JobBasicDetailsFormValues>[] =
  [
    {
      name: "role",
      label: "Title/ Position",
      type: "select",
      className: "md:w-[48%] [&_input]:w-full",
    },
    {
      name: "job_type",
      label: "Job Type",
      type: "select",
      className: "md:w-[48%] [&_input]:w-full",
      selectFieldProps: {
        options: ["FT", "PT", "CW", "IN"].map(t => ({
          // @ts-ignore
          label: jobTypeEnumToLabel(t),
          value: t,
        })),
      },
    },
    {
      name: "job_level",
      label: "Job Level",
      type: "select",
      className: "md:w-[48%] [&_input]:w-full",
      selectFieldProps: {
        options: JOB_LEVEL_OPTIONS,
      },
    },
    {
      name: "country",
      label: "Country",
      className: "md:w-[48%] [&_input]:w-full",
    },
    {
      name: "work_mode",
      label: "Work Mode",
      type: "select",
      className: "md:w-[48%] [&_input]:w-full",
      selectFieldProps: { options: WORK_TYPE_OPTIONS },
    },

    {
      name: "experience",
      label: "Minimum Experience",
      type: "select",
      className: "md:w-[48%] [&_input]:w-full",
      selectFieldProps: {
        options: Array.from({ length: 11 }, (_, i) => i).map(b => ({
          label: `${b} ${handlePlural(b, "year")}`,
          value: b,
        })),
      },
    },
    {
      name: "salary_duration",
      label: "Payment Type",
      type: "select",
      className: "md:w-[48%] [&_input]:w-full",
      selectFieldProps: {
        options: ["PH", "PM", "CT"].map(b => ({
          label: jobSalaryTypeToLabel(b as any),
          value: b,
        })),
      },
    },
    {
      name: "payment_range",
      label: "Payment Range",
      type: "select",
      className: "md:w-[48%] [&_input]:w-full",
    },
  ];

export const jobRequirementFormFields: FormField<JobRequirementFormValues>[] = [
  {
    name: "job_requirement",
    label: "",
    type: "richtext",
    placeholder: "Add your requirements",
    richTextToolbar: jobPostingRichTextToolbar,
  },
];
export const jobDescriptionFormFields: FormField<JobDescriptionFormValues>[] = [
  {
    name: "description",
    label: "",
    type: "richtext",
    placeholder: "Add your description",
    richTextToolbar: jobPostingRichTextToolbar,
  },
];

export const companyDescriptionFormFields: FormField<CompanyDescriptionFormValues>[] =
  [
    {
      name: "about_company",
      label: "",
      type: "richtext",
      placeholder: "Describe the role and what it's like to work in it",
      richTextToolbar: jobPostingRichTextToolbar,
    },
  ];
export const validationSchema = jobBasicDetailsValidationSchema
  .concat(jobRequirementValidationSchema)
  .concat(jobDescriptionValidationSchema)
  .concat(companyDescriptionValidationSchema)
  .concat(
    Yup.object().shape({
      hiring_type: Yup.string()
        .required()
        .oneOf(["With AI", "Manually"], "Please select a valid hiring type")
        .label("Hiring Type"),
    })
  );

export type InitialValues = Yup.InferType<typeof validationSchema>;

export const initialValues: InitialValues = {
  title: "",
  role: "",
  // @ts-ignore
  job_level: "",
  // @ts-ignore,
  salary_duration: "",
  payment_range: "",
  // highest_education: "",
  experience: 0,
  // @ts-ignore
  job_type: "",
  // @ts-ignore
  work_mode: "",
  country: "",
  description: "",
  payment_currency: "USD",
  // @ts-ignore
  hiring_type: "",
  about_company: "",
  job_requirement: "",
};

export const formSections = [
  {
    title: "Basic Details",
    fields: jobBasicDetailsFormFields,
  },
  {
    title: "About the role",
    description:
      "Describe what it's like working in this role and what kind of person would thrive in it. Note: This information will be used to evaluate the cultural fitness of applicants.",
    fields: companyDescriptionFormFields,
  },
  {
    title: "Job Requirement",
    fields: jobRequirementFormFields,
  },
  {
    title: "Job Description",
    description:
      "Outline the role summary, key responsibilities, and any preferred qualifications. Note: This information will help create a customized assessment tailored to the role.",
    fields: jobDescriptionFormFields,
  },
];

