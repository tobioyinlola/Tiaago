import type { ApplicationConfiguration, Job } from "@/app/common/types";

/** The form a job published before configurable journeys existed. The API
 * stores such jobs with an EMPTY configuration object ({}), which is truthy in
 * JavaScript -- so "config || legacy" never fell back, and the apply page
 * crashed reading `.required` from a field that was not there. */
export const LEGACY_APPLICATION_CONFIGURATION: ApplicationConfiguration = {
  version: 1,
  resume: { enabled: true, required: true },
  linkedin: { enabled: true, required: true },
  cover_letter: { enabled: true, required: false },
  additional_info: {
    enabled: false,
    required: false,
    label: "Anything else you'd like us to know?",
  },
};

const FIELDS = ["resume", "linkedin", "cover_letter", "additional_info"] as const;

/** The candidate form for a job, with every field guaranteed present. Anything
 * the job did not specify falls back to the legacy default. */
export const resolveApplicationConfiguration = (
  stored: Partial<ApplicationConfiguration> | null | undefined
): ApplicationConfiguration => {
  const resolved = { ...LEGACY_APPLICATION_CONFIGURATION } as ApplicationConfiguration;
  if (!stored || typeof stored !== "object") return resolved;
  for (const field of FIELDS) {
    const value = stored[field];
    if (value && typeof value === "object") {
      (resolved as any)[field] = { ...LEGACY_APPLICATION_CONFIGURATION[field], ...value };
    }
  }
  if (stored.intake) resolved.intake = stored.intake;
  return resolved;
};

const EMPTY_RUBRIC = { version: 1 as const, passing_score: 60, criteria: [] };

export const resolveWorkSampleConfiguration = (job: Pick<Job, "work_sample_configuration">) => ({
  enabled: false,
  required: false,
  prompt: "",
  instructions: "",
  ...(job.work_sample_configuration || {}),
  rubric: job.work_sample_configuration?.rubric || EMPTY_RUBRIC,
});

export const resolveScenarioConfiguration = (job: Pick<Job, "scenario_configuration">) => ({
  enabled: false,
  required: false,
  prompt: "",
  instructions: "",
  response_label: "Your response",
  ...(job.scenario_configuration || {}),
  rubric: job.scenario_configuration?.rubric || EMPTY_RUBRIC,
});
