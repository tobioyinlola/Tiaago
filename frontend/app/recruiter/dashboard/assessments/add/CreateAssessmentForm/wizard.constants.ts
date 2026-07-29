import * as Yup from "yup";

import { CompanySkillAssessment } from "@/app/common/types";

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
  // Availability window -- only collected (and only required) while the
  // "Start and end date/time" toggle is on. Held as the raw
  // `datetime-local` string ("YYYY-MM-DDTHH:mm"), which DRF parses fine.
  start_at: Yup.string()
    .nullable()
    .label("Start date/time")
    .when("use_start_and_end_time", {
      is: true,
      then: schema => schema.required("Start date/time is required"),
    }),
  end_at: Yup.string()
    .nullable()
    .label("End date/time")
    .when("use_start_and_end_time", {
      is: true,
      then: schema =>
        schema.required("End date/time is required").test(
          "end-after-start",
          "End date/time must be after the start date/time",
          function (value) {
            const start = this.parent?.start_at;
            if (!value || !start) return true;
            return new Date(value).getTime() > new Date(start).getTime();
          }
        ),
    }),
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
  start_at: "",
  end_at: "",
};

/** `<input type="datetime-local">` only accepts "YYYY-MM-DDTHH:mm" in local
 * time -- the API hands back a full ISO string (usually UTC with a "Z"), so
 * it has to be shifted into the browser's zone before it will display. */
export const toDatetimeLocalValue = (iso?: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

/** Rehydrates step 0's Formik state from an assessment row that already
 * exists server-side -- used when a recruiter resumes an abandoned draft
 * via /assessments/add?assessmentId=<id>. */
export const detailsValuesFromAssessment = (
  assessment: CompanySkillAssessment
): DetailsFormValues => ({
  ...detailsInitialValues,
  title: assessment.title ?? "",
  description: assessment.description ?? "",
  difficulty_level: assessment.difficulty_level ?? "",
  skillsets: (assessment.skillsets ?? []).map(skillset => String(skillset.id)),
  assessment_type: assessment.assessment_type ?? "",
  duration_minutes: assessment.duration_minutes ?? detailsInitialValues.duration_minutes,
  passing_grade: assessment.passing_grade ?? detailsInitialValues.passing_grade,
  show_results_to_candidate: assessment.show_results_to_candidate ?? true,
  display_review_and_approve_responses: !!assessment.display_review_and_approve_responses,
  display_feedback: !!assessment.display_feedback,
  shuffle_questions: !!assessment.shuffle_questions,
  use_public_link: !!assessment.use_public_link,
  use_start_and_end_time: !!assessment.use_start_and_end_time,
  start_at: toDatetimeLocalValue(assessment.start_at),
  end_at: toDatetimeLocalValue(assessment.end_at),
});

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
