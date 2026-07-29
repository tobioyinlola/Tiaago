import { Job } from "../types";

/** Job level is a single backend enum (`Job.JobLevel`) that several unrelated
 * screens render -- the create/edit job form, the ATS "convert job" modal and
 * the sourcing outreach dialog each used to keep their own copy of the
 * value/label pairs, which is how the retired "ENTRY" option survived in three
 * places at once. Everything job-level related now derives from here. */
export const JOB_LEVEL_OPTIONS: { value: Job["job_level"]; label: string }[] = [
  { value: "JUNIOR", label: "Junior" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "SENIOR", label: "Senior" },
];

export const JOB_LEVEL_VALUES = JOB_LEVEL_OPTIONS.map(({ value }) => value);

export const JOB_LEVEL_DISPLAY: Record<string, string> = Object.fromEntries(
  JOB_LEVEL_OPTIONS.map(({ value, label }) => [value, label])
);
