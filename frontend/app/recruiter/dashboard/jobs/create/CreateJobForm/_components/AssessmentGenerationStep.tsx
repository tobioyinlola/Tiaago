"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, ShieldCheck, Sparkles, FolderOpen } from "lucide-react";
import { FormikErrors, FormikTouched } from "formik";

import { cn } from "@/app/common/utils";
import { AssessmentQuestionSection } from "@/app/common/types";
import FormikField from "@/app/common/components/Forms/FormikField";
import { Switch } from "@/app/common/components/ui/switch";
import { startAssessmentGeneration, getAssessmentGenerationStatus } from "@/app/common/services/jobs";
import { AssessmentGenerationFormValues } from "../wizard.constants";
import AssessmentSourcePicker from "./AssessmentSourcePicker";

const POLL_INTERVAL_MS = 3000;

const INTEGRITY_LEVELS = [
  { min: 0, label: "Minimal", className: "bg-[#EAECF0] text-secondary-black w-1/3" },
  { min: 3, label: "Standard", className: "bg-warning/15 text-warning w-2/3" },
  { min: 6, label: "Strict", className: "bg-success/15 text-success w-full" },
] as const;

const RESTRICTIVE_SETTING_KEYS = [
  "require_fullscreen",
  "require_webcam",
  "webcam_snapshots_enabled",
  "copy_paste_blocked",
  "right_click_blocked",
  "devtools_detection_enabled",
  "force_submit_on_critical_violation",
] as const;

type FullValues = AssessmentGenerationFormValues & {
  role: string | number;
  description: string;
  job_requirement: string;
  job_level: string;
};

const AssessmentGenerationStep = ({
  values,
  errors,
  touched,
  setFieldValue,
}: {
  values: FullValues;
  errors: FormikErrors<AssessmentGenerationFormValues>;
  touched: FormikTouched<AssessmentGenerationFormValues>;
  setFieldValue: (field: string, value: any) => void;
}) => {
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasQuestions = (values.assessment_questions || []).length > 0;

  const integrityLevel = useMemo(() => {
    const activeCount = RESTRICTIVE_SETTING_KEYS.filter(key => values[key]).length;
    return [...INTEGRITY_LEVELS].reverse().find(level => activeCount >= level.min) ?? INTEGRITY_LEVELS[0];
  }, [values]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setStatus("generating");
    setErrorMessage("");

    const started = await startAssessmentGeneration({
      role: values.role,
      description: values.description,
      job_requirement: values.job_requirement,
      job_level: values.job_level,
    });
    if (!started.success) {
      setStatus("error");
      setErrorMessage(started.error || "Failed to generate assessment questions");
      return;
    }

    const requestId = started.data.request_id;

    const poll = async () => {
      const result = await getAssessmentGenerationStatus(requestId);
      if (!result.success) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setStatus("error");
        setErrorMessage(result.error || "Failed to generate assessment questions");
        return;
      }
      if (result.data.status === "READY") {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setFieldValue("assessment_questions", result.data.sections);
        setStatus("idle");
        toast.success("Assessment questions generated");
      } else if (result.data.status === "FAILED") {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setStatus("error");
        setErrorMessage(result.data.error || "Failed to generate assessment questions");
      }
      // PENDING/GENERATING -- keep polling
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
  };

  const handleUseSource = (sections: AssessmentQuestionSection[]) => {
    setFieldValue("assessment_questions", sections);
    setStatus("idle");
    setErrorMessage("");
  };

  const updateQuestion = (
    sectionIndex: number,
    questionIndex: number,
    patch: Partial<AssessmentQuestionSection["questions"][number]>
  ) => {
    const next = values.assessment_questions.map((section, sIdx) => {
      if (sIdx !== sectionIndex) return section;
      return {
        ...section,
        questions: section.questions.map((q, qIdx) =>
          qIdx === questionIndex ? { ...q, ...patch } : q
        ),
      };
    });
    setFieldValue("assessment_questions", next);
  };

  const updateOption = (
    sectionIndex: number,
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {
    const question = values.assessment_questions[sectionIndex].questions[questionIndex];
    const options = question.options.map((opt, i) =>
      i === optionIndex ? { ...opt, value } : opt
    );
    updateQuestion(sectionIndex, questionIndex, { options });
  };

  return (
    <div className='space-y-8'>
      <div className='md:w-[48%]'>
        <FormikField
          name='assessment_time_limit'
          label='Assessment time limit (minutes)'
          type='number'
          placeholder='e.g. 30'
          value={values.assessment_time_limit}
          error={errors.assessment_time_limit}
          touched={touched.assessment_time_limit}
        />
      </div>

      <div>
        <div className='flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EAECF0] mb-4'>
          <div className='flex items-center gap-2'>
            <ShieldCheck className='h-4 w-4 text-primary' />
            <div>
              <h3 className='text-base font-bold text-primary-black'>Proctoring</h3>
              <p className='text-sm text-secondary-black mt-1'>
                Choose which integrity measures apply while candidates take this assessment.
              </p>
            </div>
          </div>
          <div className='flex flex-col items-end gap-1'>
            <span className='text-xs font-semibold text-secondary-black'>
              Integrity assurance: {integrityLevel.label}
            </span>
            <div className='h-1.5 w-28 rounded-full bg-[#EAECF0] overflow-hidden'>
              <div className={cn("h-full rounded-full transition-all", integrityLevel.className)} />
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-4 mb-4'>
          <label className='flex items-center justify-between gap-3 cursor-pointer'>
            <span className='text-sm text-primary-black'>Enable proctoring for this assessment</span>
            <Switch
              checked={values.proctoring_enabled}
              onCheckedChange={checked => setFieldValue("proctoring_enabled", checked)}
            />
          </label>
        </div>

        {values.proctoring_enabled && (
          <div className='flex flex-col gap-4 rounded-lg border border-[#EAECF0] p-4 mb-8'>
            {[
              { key: "require_fullscreen" as const, label: "Require fullscreen mode" },
              { key: "require_webcam" as const, label: "Require webcam access" },
              {
                key: "webcam_snapshots_enabled" as const,
                label: "Capture periodic webcam snapshots",
                disabled: !values.require_webcam,
              },
              { key: "copy_paste_blocked" as const, label: "Block copy and paste" },
              { key: "right_click_blocked" as const, label: "Block right-click" },
              { key: "devtools_detection_enabled" as const, label: "Detect developer tools" },
              {
                key: "force_submit_on_critical_violation" as const,
                label: "Auto-submit on critical violation",
              },
            ].map(({ key, label, disabled }) => (
              <label
                key={key}
                className={cn(
                  "flex items-center justify-between gap-3",
                  disabled ? "opacity-50" : "cursor-pointer"
                )}
              >
                <span className='text-sm text-primary-black'>{label}</span>
                <Switch
                  checked={values[key]}
                  disabled={disabled}
                  onCheckedChange={checked => setFieldValue(key, checked)}
                />
              </label>
            ))}

            {values.webcam_snapshots_enabled && (
              <FormikField
                name='snapshot_interval_seconds'
                label='Snapshot interval (seconds)'
                type='number'
                value={values.snapshot_interval_seconds}
                error={errors.snapshot_interval_seconds}
                touched={touched.snapshot_interval_seconds}
              />
            )}

            <div className='grid sm:grid-cols-2 gap-4'>
              <FormikField
                name='max_tab_switches_before_warning'
                label='Tab switches before warning'
                type='number'
                value={values.max_tab_switches_before_warning}
                error={errors.max_tab_switches_before_warning}
                touched={touched.max_tab_switches_before_warning}
              />
              <FormikField
                name='max_tab_switches_before_termination'
                label='Tab switches before auto-submit'
                type='number'
                value={values.max_tab_switches_before_termination}
                error={errors.max_tab_switches_before_termination}
                touched={touched.max_tab_switches_before_termination}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <div className='flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EAECF0] mb-4'>
          <div>
            <h3 className='text-base font-bold text-primary-black'>
              Assessment questions
            </h3>
            <p className='text-sm text-secondary-black mt-1'>
              Generated live from your job details -- review and edit before posting.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => setSourcePickerOpen(true)}
              disabled={status === "generating"}
              className='btn btn-outline gap-2 disabled:opacity-70'
              title='Reuse a saved assessment you already built, or the question bank'
            >
              <FolderOpen className='h-4 w-4' /> Saved Assessment
            </button>
            <button
              type='button'
              onClick={handleGenerate}
              disabled={status === "generating"}
              className='btn btn-primary text-white gap-2 disabled:opacity-70'
            >
              {status === "generating" ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' /> Generating...
                </>
              ) : hasQuestions ? (
                <>
                  <RefreshCw className='h-4 w-4' /> Regenerate
                </>
              ) : (
                <>
                  <Sparkles className='h-4 w-4' /> Generate Questions
                </>
              )}
            </button>
          </div>
        </div>

        {status === "generating" && (
          <div className='flex flex-col items-center justify-center gap-3 py-16 rounded-lg border border-dashed border-[#EAECF0] animate-fade-in'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-sm text-secondary-black'>
              Writing your assessment questions across multiple categories -- this can take a minute...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className='flex flex-col items-center justify-center gap-3 py-12 rounded-lg border border-error/30 bg-error/5'>
            <p className='text-sm text-error text-center max-w-md'>{errorMessage}</p>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={handleGenerate}
                className='btn btn-outline btn-error gap-2'
              >
                <RefreshCw className='h-4 w-4' /> Retry
              </button>
              <button
                type='button'
                onClick={() => setSourcePickerOpen(true)}
                className='btn btn-outline gap-2'
              >
                <FolderOpen className='h-4 w-4' /> Saved Assessment
              </button>
            </div>
          </div>
        )}

        {status === "idle" && !hasQuestions && (
          <div className='flex flex-col items-center justify-center gap-3 py-16 rounded-lg border border-dashed border-[#EAECF0] text-center'>
            <p className='text-sm text-secondary-black max-w-sm'>
              No questions generated yet. Click &quot;Generate Questions&quot; to create an
              assessment from your job details (technical roles include a coding section), or
              reuse questions from an assessment you already built or the question bank.
            </p>
            <button
              type='button'
              onClick={() => setSourcePickerOpen(true)}
              className='btn btn-outline btn-sm gap-2'
            >
              <FolderOpen className='h-4 w-4' /> Saved Assessment
            </button>
          </div>
        )}

        {status === "idle" && hasQuestions && (
          <div className='flex flex-col gap-6'>
            {values.assessment_questions.map((section, sectionIndex) => (
              <div
                key={section.category}
                className='collapse collapse-arrow rounded-lg border border-[#EAECF0]'
              >
                <input type='checkbox' />
                <div className='collapse-title flex items-center gap-2 min-h-0 py-4 px-4'>
                  <span className='inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1'>
                    {section.category}
                  </span>
                  <span className='text-xs text-secondary-black'>
                    {section.questions.length} questions
                  </span>
                </div>
                <div className='collapse-content flex flex-col gap-5 px-4'>
                  {section.questions.map((question, questionIndex) => (
                    <div
                      key={questionIndex}
                      className='pb-5 border-b border-[#EAECF0] last:border-b-0 last:pb-0'
                    >
                      <textarea
                        className='textarea textarea-bordered w-full text-sm'
                        value={question.question}
                        onChange={e =>
                          updateQuestion(sectionIndex, questionIndex, {
                            question: e.target.value,
                          })
                        }
                      />
                      <div className='grid sm:grid-cols-2 gap-2 mt-3'>
                        {question.options.map((option, optionIndex) => (
                          <label
                            key={optionIndex}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
                              question.correct_option_index === optionIndex
                                ? "border-success bg-success/5"
                                : "border-[#EAECF0]"
                            )}
                          >
                            <input
                              type='radio'
                              name={`correct-${sectionIndex}-${questionIndex}`}
                              checked={question.correct_option_index === optionIndex}
                              onChange={() =>
                                updateQuestion(sectionIndex, questionIndex, {
                                  correct_option_index: optionIndex,
                                })
                              }
                              className='radio radio-primary radio-sm'
                            />
                            <input
                              className='flex-1 border-0 focus:outline-none bg-transparent text-sm'
                              value={option.value}
                              onChange={e =>
                                updateOption(
                                  sectionIndex,
                                  questionIndex,
                                  optionIndex,
                                  e.target.value
                                )
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {typeof errors.assessment_questions === "string" &&
          touched.assessment_questions && (
            <p className='text-xs text-error mt-2'>{errors.assessment_questions}</p>
          )}
      </div>

      <AssessmentSourcePicker
        open={sourcePickerOpen}
        onClose={() => setSourcePickerOpen(false)}
        onSelect={handleUseSource}
      />
    </div>
  );
};

export default AssessmentGenerationStep;
