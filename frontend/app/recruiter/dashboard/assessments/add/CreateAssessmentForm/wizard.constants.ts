import * as Yup from "yup";

export const difficultyLevels = ["Junior", "Intermediate", "Senior"];

export const assessmentTypeOptions = [
  { label: "Multiple Choice (MCQ)", value: "MCQ" },
  { label: "Coding Task", value: "CODING_TASK" },
  { label: "Open-Ended (manually graded)", value: "OPEN_ENDED" },
  { label: "Hybrid (mix of types)", value: "MIXED" },
];

export const detailsValidationSchema = Yup.object().shape({
  title: Yup.string().required().label("Assessment title"),
  description: Yup.string().required().max(500).label("Assessment description"),
  difficulty_level: Yup.string()
    .oneOf(difficultyLevels.map(dl => dl.toUpperCase()))
    .required()
    .label("Difficulty level"),
  skillsets: Yup.array().of(Yup.string().required()).min(1).required().label("Skill set"),
  assessment_type: Yup.string()
    .oneOf(assessmentTypeOptions.map(o => o.value))
    .required()
    .label("Assessment type"),
  duration_minutes: Yup.number().required().min(1).integer().label("Duration"),
  passing_grade: Yup.number().required().min(1).max(100).label("Passing grade"),
  show_results_to_candidate: Yup.boolean().required(),
  display_review_and_approve_responses: Yup.boolean().required(),
  display_feedback: Yup.boolean().required(),
  shuffle_questions: Yup.boolean().required(),
  use_public_link: Yup.boolean().required(),
  use_start_and_end_time: Yup.boolean().required(),
});

export type DetailsFormValues = Yup.InferType<typeof detailsValidationSchema>;

export const detailsInitialValues: DetailsFormValues = {
  title: "",
  description: "",
  difficulty_level: "",
  skillsets: [],
  assessment_type: "",
  duration_minutes: 30,
  passing_grade: 70,
  show_results_to_candidate: true,
  display_review_and_approve_responses: true,
  display_feedback: true,
  shuffle_questions: true,
  use_public_link: false,
  use_start_and_end_time: false,
};

type BooleanField = {
  name:
    | "display_review_and_approve_responses"
    | "display_feedback"
    | "shuffle_questions"
    | "use_public_link"
    | "use_start_and_end_time";
  label: string;
  description: string;
};

export const booleanFields: BooleanField[] = [
  {
    name: "display_review_and_approve_responses",
    label: "Review and approve responses",
    description: "If turned off, candidates will see results without your review and approval",
  },
  {
    name: "display_feedback",
    label: "Display feedback",
    description: "If turned off, candidates will not see the reason they fail or pass",
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
    description: "Set a start and end date/time for this assessment",
  },
];

// Step 2 (set-assessment) and step 3 (preview) have no Formik-tracked
// fields of their own -- sections live server-side (added via direct API
// calls as the recruiter picks bundles/builds custom tests) and are
// validated at submit-time in index.tsx by checking the fetched section
// count directly, not through Yup.
export const setAssessmentValidationSchema = Yup.object().shape({});
export const previewValidationSchema = Yup.object().shape({});

export const wizardSteps = [
  {
    key: "assessment-details",
    title: "Assessment Details",
    description: "Basic details recruiters and candidates will see.",
    validationSchema: detailsValidationSchema,
  },
  {
    key: "set-assessment",
    title: "Set Assessment",
    description: "Add tests from the library or build your own, then continue.",
    validationSchema: setAssessmentValidationSchema,
  },
  {
    key: "preview-finalize",
    title: "Preview & Finalize",
    description: "Review the assembled assessment before publishing.",
    validationSchema: previewValidationSchema,
  },
] as const;
