import * as Yup from "yup";

import { FormField, Job } from "@/app/common/types";
import {
  handlePlural,
  jobSalaryTypeToLabel,
  jobTypeEnumToLabel,
} from "@/app/common/utils";
import { richtextValidationSchema } from "@/app/common/constants/validationSchemas";

export const jobBasicDetailsValidationSchema = Yup.object().shape({
  role: Yup.string().required().label("Job title/position"),
  job_type: Yup.string()
    .required()
    .label("Job type")
    .oneOf<Job["job_type"]>(
      ["FT", "PT", "CW", "IN"],
      "Please select a valid job type"
    ),
  salary_duration: Yup.string().required().label("Payment type"),
  payment_range: Yup.string().required().label("Payment range"),
  payment_currency: Yup.string().required().label("Currency"),
  experience: Yup.number().required().min(0).label("Experience"),
  location: Yup.string().required().label("Location"),
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
      name: "location",
      label: "Location",
      className: "md:w-[48%] [&_input]:w-full",
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
  },
];
export const jobDescriptionFormFields: FormField<JobDescriptionFormValues>[] = [
  {
    name: "description",
    label: "",
    type: "richtext",
    placeholder: "Add your description",
  },
];

export const companyDescriptionFormFields: FormField<CompanyDescriptionFormValues>[] =
  [
    {
      name: "about_company",
      label: "",
      type: "richtext",
      placeholder: "Add your company description",
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
  // @ts-ignore,
  salary_duration: "",
  payment_range: "",
  // highest_education: "",
  experience: 0,
  // @ts-ignore
  job_type: "",
  location: "",
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
    title: "About your company",
    description:
      "Your company values and culture is required here. Note: This information will be used to evaluate the cultural fitness of applicants.",
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

export const hireWithAiBooleanFields = [
  {
    name: "automated_assessment_creation",
    label: "Automated Assessment Creation",
    type: "checkbox",
    description:
      "Our AI Hiring Manager crafts customized assessments based on the specific requirements of the job",
    disabled: true,
    defaultValue: true,
  },
  {
    name: "automated_assessment_grading",
    label: "Automated Assessment Grading",
    type: "checkbox",
    description:
      "Our AI Hiring Manager evaluates each candidate’s assessment and based on  a qualification score you assign, selects the top performers",
    disabled: true,
    defaultValue: true,
  },
  {
    name: "automated_resume_screening",
    label: "Automated Resume Screening",
    type: "checkbox",
    description:
      "Our AI Hiring Manager reviews and scores each resume, analyzing qualifications and experience to identify the best matches for the role",
    disabled: true,
    defaultValue: true,
  },
  {
    name: "pre_screening_interview",
    label: "Pre-screening Interview (Coming soon)",
    type: "checkbox",
    description:
      "Our AI Hiring Manager automatically pre-screens qualified candidates and gives a feedback to ascertain their qualification for an interview ",
    disabled: true,
    defaultValue: false,
  },
];

export const qualificationCriteriaStages = [
  {
    stage: "Stage one",
    name: "Resume Analysis",
    criteria: 70,
    tip: "Each applicant’s resume is evaluated for alignment with job requirements. This analysis contributes 40% to the overall score in stage one.",
  },
  {
    stage: "Stage two",
    name: "Skill Assessment",
    criteria: 70,
  },
  // {
  //   stage: "Stage three",
  //   name: "Pre-screening Interview",
  //   criteria: 70,
  // },
];
