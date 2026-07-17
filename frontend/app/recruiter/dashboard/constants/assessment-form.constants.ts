import * as Yup from "yup";

import { FormField } from "@/app/common/types";
import { assessmentTypes } from "../assessments/_components/AddAssessmentModal";

const difficultyLevels = ["Junior", "Intermediate", "Senior"];
export const questionTypes = assessmentTypes.map(at => at.type.toUpperCase());

export const assessmentBasicDetailsValidationSchema = Yup.object().shape({
  title: Yup.string().required().label("Assessment title"),
  difficulty_level: Yup.string()
    .oneOf(difficultyLevels.map(dl => dl.toUpperCase()))
    .required()
    .label("Difficulty level"),
  skillsets: Yup.array()
    .of(Yup.string().required())
    .required()
    .min(1)
    .label("Skill set"),
  assessment_type: Yup.string().oneOf(questionTypes).label("Question type"),
  description: Yup.string().required().max(150).label("Assessment description"),
});

export const assessmentAdvancedDetailsValidationSchema = Yup.object().shape({
  duration_minutes: Yup.number()
    .required()
    .min(1)
    .integer()
    .label("Assessment duration"),
  passing_grade: Yup.number().required().min(1).max(100).label("Passing grade"),
  display_review_and_approve_responses: Yup.boolean()
    .required()
    .label("Review responses"),
  display_feedback: Yup.boolean().required().label("Display feedback"),
  shuffle_questions: Yup.boolean().required().label("Shuffle questions"),
  use_public_link: Yup.boolean().required().label("Use public link"),
  use_start_and_end_time: Yup.boolean()
    .required()
    .label("Use start and end time"),
});

type AssessmentBasicDetailsFormValues = Yup.InferType<
  typeof assessmentBasicDetailsValidationSchema
>;

type AssessmentAdvancedDetailsFormValues = Yup.InferType<
  typeof assessmentAdvancedDetailsValidationSchema
>;

export const assessmentBasicDetailsFormFields: FormField<AssessmentBasicDetailsFormValues>[] =
  [
    {
      name: "title",
      label: "Assessment title",
      className: "md:w-[48%] [&_input]:w-full",
    },
    {
      name: "difficulty_level",
      label: "Difficulty level",
      type: "select",
      className: "md:w-[48%]",
      selectFieldProps: {
        options: difficultyLevels.map(dl => ({
          label: dl,
          value: dl.toUpperCase(),
        })),
      },
    },
    {
      name: "skillsets",
      label: "Skill sets",
      type: "select",
      className: "md:w-[48%]",
      selectFieldProps: { isMulti: true },
    },
    {
      name: "assessment_type",
      label: "Question type (optional)",
      type: "select",
      className: "md:w-[48%]",
      selectFieldProps: {
        options: assessmentTypes.map(at => ({
          label: at.name,
          value: at.type.toUpperCase(),
        })),
      },
    },
    {
      name: "description",
      label: "Assessment description",
      type: "textarea",
    },
  ];

export const assessmentBasicDetailsInitialFormValues: AssessmentBasicDetailsFormValues =
  {
    title: "",
    difficulty_level: "",
    skillsets: [],
    assessment_type: "",
    description: "",
  };

export const assessmentAdvancedDetailsInitialFormValues: AssessmentAdvancedDetailsFormValues =
  {
    duration_minutes: 0,
    passing_grade: 0,
    display_review_and_approve_responses: true,
    display_feedback: true,
    shuffle_questions: true,
    use_public_link: false,
    use_start_and_end_time: true,
  };

export const initialValues = {
  ...assessmentBasicDetailsInitialFormValues,
  ...assessmentAdvancedDetailsInitialFormValues,
};

export const validationSchema = assessmentBasicDetailsValidationSchema.concat(
  assessmentAdvancedDetailsValidationSchema
);

type BooleanField = {
  name: keyof typeof assessmentAdvancedDetailsInitialFormValues;
  label: string;
  description: string;
};

export const booleanFields: BooleanField[] = [
  {
    name: "display_review_and_approve_responses",
    label: "Review and approve responses",
    description:
      "If turned off, talents will see results without your review and approval",
  },
  {
    name: "display_feedback",
    label: "Display feedback",
    description:
      "If turned off, talents will not see the reason they fail or pass assessment",
  },
  {
    name: "shuffle_questions",
    label: "Shuffle questions",
    description: "Questions will be shuffled at every attempt",
  },
  {
    name: "use_public_link",
    label: "Use public link",
    description: "Use this assessment for external purposes",
  },
  {
    name: "use_start_and_end_time",
    label: "Start and end date/time",
    description: "Set start and end date/time for your assessment",
  },
];
