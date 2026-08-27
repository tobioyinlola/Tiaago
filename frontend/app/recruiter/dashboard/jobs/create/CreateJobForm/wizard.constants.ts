import * as Yup from "yup";

import { AssessmentQuestionSection, InterviewAvailabilityInput } from "@/app/common/types";
import {
  jobBasicDetailsValidationSchema,
  companyDescriptionValidationSchema,
  jobRequirementValidationSchema,
  jobDescriptionValidationSchema,
} from "./form.constants";

export const jobDetailsValidationSchema = jobBasicDetailsValidationSchema
  .concat(jobRequirementValidationSchema)
  .concat(jobDescriptionValidationSchema)
  .concat(companyDescriptionValidationSchema);

export const criteriaAvailabilityValidationSchema = Yup.object().shape({
  screening_threshold: Yup.number()
    .typeError("Please enter a screening threshold")
    .required("Please set a screening threshold")
    .min(0, "Must be at least 0%")
    .max(100, "Must be at most 100%")
    .label("Screening threshold"),
  passing_grade: Yup.number()
    .typeError("Please enter an assessment passing grade")
    .required("Please set an assessment passing grade")
    .min(0, "Must be at least 0%")
    .max(100, "Must be at most 100%")
    .label("Assessment passing grade"),
  // Always required now: the AI interview gates the human interview rather
  // than replacing it, so every job still needs slots for candidates who
  // clear the AI stage to pick from.
  interview_availability: Yup.object().when("ai_interview_enabled", {
    is: () => true,
    then: schema =>
      schema.shape({
        days_of_week: Yup.array()
          .of(Yup.number())
          .min(1, "Select at least one day you're available")
          .label("Interview availability days"),
        start_time: Yup.string().required("Please set a start time"),
        end_time: Yup.string()
          .required("Please set an end time")
          .test(
            "is-after-start",
            "End time must be after start time",
            function (end_time) {
              const { start_time } = this.parent;
              return !start_time || !end_time || end_time > start_time;
            }
          ),
      }),
  }),
  ai_interview_enabled: Yup.boolean(),
  ai_interview_duration_minutes: Yup.number().oneOf([5, 8, 10]).label("AI interview duration"),
  ai_interview_questions_count: Yup.number().oneOf([4, 5, 6]).label("AI interview question count"),
  ai_interview_window_hours: Yup.number().oneOf([48, 72]).label("AI interview window"),
  // Only meaningful with the AI interview on -- it is the score a candidate
  // must reach there before they can pick a human interview slot.
  ai_interview_pass_mark: Yup.number()
    .when("ai_interview_enabled", {
      is: true,
      then: schema =>
        schema
          .typeError("Please enter an AI interview pass mark")
          .required("Please set an AI interview pass mark")
          .min(0, "Must be at least 0%")
          .max(100, "Must be at most 100%"),
      otherwise: schema => schema.nullable(),
    })
    .label("AI interview pass mark"),
  interview_type: Yup.string()
    .oneOf(["IN_HOUSE", "GOOGLE_MEET", "ZOOM", "OTHER"])
    .label("Interview type"),
  interview_duration_minutes: Yup.number()
    .oneOf([15, 30, 45, 60, 90])
    .label("Interview duration"),
  // Mirrors jobs.serializers._validate_interview_type -- an interview held
  // somewhere else is useless without the link.
  interview_meeting_url: Yup.string()
    .when("interview_type", {
      is: (value: string) => value !== "IN_HOUSE",
      then: schema =>
        schema.url("Enter a valid meeting link").required("Add the meeting link for this platform"),
      otherwise: schema => schema.strip(),
    })
    .label("Meeting link"),
});

// Edit-mode equivalent of criteriaAvailabilityValidationSchema -- the only
// difference is interview_availability is never required. A job being
// edited may already have published interview slots (or AI interview
// already configured); the recruiter shouldn't be forced to re-pick
// availability just to save an unrelated change elsewhere in the wizard.
// See jobs/edit/EditJobForm, which submits interview_slots only when the
// recruiter actually picks new days (otherwise existing slots are left
// untouched -- see jobs.serializers.JobUpdateSerializer.update).
export const editCriteriaAvailabilityValidationSchema = Yup.object().shape({
  screening_threshold: Yup.number()
    .typeError("Please enter a screening threshold")
    .required("Please set a screening threshold")
    .min(0, "Must be at least 0%")
    .max(100, "Must be at most 100%")
    .label("Screening threshold"),
  passing_grade: Yup.number()
    .typeError("Please enter an assessment passing grade")
    .required("Please set an assessment passing grade")
    .min(0, "Must be at least 0%")
    .max(100, "Must be at most 100%")
    .label("Assessment passing grade"),
  interview_availability: Yup.object(),
  ai_interview_enabled: Yup.boolean(),
  ai_interview_duration_minutes: Yup.number().oneOf([5, 8, 10]).label("AI interview duration"),
  ai_interview_questions_count: Yup.number().oneOf([4, 5, 6]).label("AI interview question count"),
  ai_interview_window_hours: Yup.number().oneOf([48, 72]).label("AI interview window"),
  // Only meaningful with the AI interview on -- it is the score a candidate
  // must reach there before they can pick a human interview slot.
  ai_interview_pass_mark: Yup.number()
    .when("ai_interview_enabled", {
      is: true,
      then: schema =>
        schema
          .typeError("Please enter an AI interview pass mark")
          .required("Please set an AI interview pass mark")
          .min(0, "Must be at least 0%")
          .max(100, "Must be at most 100%"),
      otherwise: schema => schema.nullable(),
    })
    .label("AI interview pass mark"),
  interview_type: Yup.string()
    .oneOf(["IN_HOUSE", "GOOGLE_MEET", "ZOOM", "OTHER"])
    .label("Interview type"),
  interview_duration_minutes: Yup.number()
    .oneOf([15, 30, 45, 60, 90])
    .label("Interview duration"),
  // Mirrors jobs.serializers._validate_interview_type -- an interview held
  // somewhere else is useless without the link.
  interview_meeting_url: Yup.string()
    .when("interview_type", {
      is: (value: string) => value !== "IN_HOUSE",
      then: schema =>
        schema.url("Enter a valid meeting link").required("Add the meeting link for this platform"),
      otherwise: schema => schema.strip(),
    })
    .label("Meeting link"),
});

export const assessmentGenerationValidationSchema = Yup.object().shape({
  assessment_time_limit: Yup.number()
    .typeError("Please enter a time limit")
    .required("Please set a time limit")
    .min(5, "Must be at least 5 minutes")
    .label("Assessment time limit"),
  assessment_questions: Yup.array()
    .min(1, "Please generate and review assessment questions before posting")
    .label("Assessment questions"),
  proctoring_enabled: Yup.boolean(),
  require_fullscreen: Yup.boolean(),
  require_webcam: Yup.boolean(),
  webcam_snapshots_enabled: Yup.boolean(),
  snapshot_interval_seconds: Yup.number()
    .typeError("Enter a number of seconds")
    .min(15, "Must be at least 15 seconds")
    .label("Snapshot interval"),
  max_tab_switches_before_warning: Yup.number()
    .typeError("Enter a number of tab switches")
    .min(0, "Must be 0 or more")
    .label("Tab switches before warning"),
  max_tab_switches_before_termination: Yup.number()
    .typeError("Enter a number of tab switches")
    .min(Yup.ref("max_tab_switches_before_warning"), "Must be at least the warning threshold")
    .label("Tab switches before termination"),
  copy_paste_blocked: Yup.boolean(),
  right_click_blocked: Yup.boolean(),
  devtools_detection_enabled: Yup.boolean(),
  force_submit_on_critical_violation: Yup.boolean(),
});

export type CriteriaAvailabilityFormValues = {
  screening_threshold: number | "";
  passing_grade: number | "";
  interview_availability: InterviewAvailabilityInput;
  ai_interview_enabled: boolean;
  ai_interview_duration_minutes: number;
  ai_interview_questions_count: number;
  ai_interview_window_hours: number;
  ai_interview_pass_mark: number | "";
  interview_type: "IN_HOUSE" | "GOOGLE_MEET" | "ZOOM" | "OTHER";
  interview_duration_minutes: number;
  interview_meeting_url: string;
};

export type AssessmentGenerationFormValues = {
  assessment_time_limit: number | "";
  assessment_questions: AssessmentQuestionSection[];
  proctoring_enabled: boolean;
  require_fullscreen: boolean;
  require_webcam: boolean;
  webcam_snapshots_enabled: boolean;
  snapshot_interval_seconds: number | "";
  max_tab_switches_before_warning: number | "";
  max_tab_switches_before_termination: number | "";
  copy_paste_blocked: boolean;
  right_click_blocked: boolean;
  devtools_detection_enabled: boolean;
  force_submit_on_critical_violation: boolean;
};

export const criteriaAvailabilityInitialValues: CriteriaAvailabilityFormValues = {
  // Intentionally blank -- no default values, recruiter must set these explicitly.
  screening_threshold: "",
  passing_grade: "",
  // Days intentionally blank (recruiter must pick), but the time range
  // defaults to a normal 9-5 workday since that's the common case.
  interview_availability: { days_of_week: [], start_time: "09:00", end_time: "17:00" },
  // Off by default -- matches Job.ai_interview_enabled's model default.
  ai_interview_enabled: false,
  ai_interview_duration_minutes: 10,
  ai_interview_questions_count: 6,
  ai_interview_window_hours: 72,
  // Blank on purpose, like the other two pass marks -- recruiters set it.
  ai_interview_pass_mark: "",
  // In-app by default: it needs no setup from the recruiter.
  interview_type: "IN_HOUSE",
  interview_duration_minutes: 45,
  interview_meeting_url: "",
};

export const assessmentGenerationInitialValues: AssessmentGenerationFormValues = {
  assessment_time_limit: "",
  assessment_questions: [],
  // Proctoring defaults -- match Job model defaults exactly, so a recruiter
  // who never opens the proctoring section still gets these applied.
  proctoring_enabled: true,
  require_fullscreen: true,
  require_webcam: true,
  webcam_snapshots_enabled: true,
  snapshot_interval_seconds: 60,
  max_tab_switches_before_warning: 2,
  max_tab_switches_before_termination: 5,
  copy_paste_blocked: true,
  right_click_blocked: true,
  devtools_detection_enabled: true,
  force_submit_on_critical_violation: false,
};

export const ASSESSMENT_QUESTIONS_PER_CATEGORY = 10;

export const wizardSteps = [
  {
    key: "job-details",
    title: "Job Details",
    description: "Tell candidates about the role, company, and requirements.",
    validationSchema: jobDetailsValidationSchema,
  },
  {
    key: "criteria-availability",
    title: "Criteria & Availability",
    description: "Set your screening threshold and post-assessment interview availability.",
    validationSchema: criteriaAvailabilityValidationSchema,
  },
  {
    key: "assessment-generation",
    title: "Assessment Generation",
    description: "Generate and review AI-written assessment questions.",
    validationSchema: assessmentGenerationValidationSchema,
  },
] as const;

// Same steps/components as wizardSteps -- jobs/edit/EditJobForm follows the
// exact same wizard flow as job creation, just pre-filled from the existing
// job and with a relaxed step-2 validation schema (see
// editCriteriaAvailabilityValidationSchema above).
export const editWizardSteps = [
  wizardSteps[0],
  {
    ...wizardSteps[1],
    validationSchema: editCriteriaAvailabilityValidationSchema,
  },
  wizardSteps[2],
] as const;
