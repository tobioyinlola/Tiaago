"use client";

import { useRef, useState } from "react";
import { Formik } from "formik";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";

import Button from "@/app/common/components/DaisyButton";
import { useAlert } from "@/app/common/store/useAlert";
import { TalentRole } from "@/app/common/types";
import { useScrollToTop } from "@/app/common/hooks/useScrollToTop";
import { handleFormSubmissionError } from "@/app/common/utils";
import FormikField from "@/app/common/components/Forms/FormikField";
import StepIndicator from "../../../jobs/create/CreateJobForm/_components/StepIndicator";
import {
  createCompanyAssessment,
  getCompanyAssessment,
  publishCompanyAssessment,
} from "@/app/common/services/assessment";
import {
  wizardSteps,
  detailsInitialValues,
  assessmentTypeOptions,
  difficultyLevels,
  booleanFields,
} from "./wizard.constants";
import BundleLibraryStep, { SelectedSection } from "./_components/BundleLibraryStep";
import CustomSectionModal from "./_components/CustomSectionModal";
import PreviewPublishStep from "./_components/PreviewPublishStep";
import InviteCandidatesModal from "../../_components/InviteCandidatesModal";

const totalSteps = wizardSteps.length;

const CreateAssessmentForm = ({ talentRoles }: { talentRoles: TalentRole[] }) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const scrollToTop = useScrollToTop("recruiter-dashboard-scroll-area");
  const [step, setStep] = useState(0);
  const currentStep = wizardSteps[step];
  const isLastStep = step === totalSteps - 1;

  const [assessmentId, setAssessmentId] = useState<string | number | null>(null);
  const [sections, setSections] = useState<SelectedSection[]>([]);
  const [publishedTitle, setPublishedTitle] = useState("");
  const successModalRef = useRef<HTMLDialogElement>(null);
  const customSectionModalRef = useRef<HTMLDialogElement>(null);

  // Lives outside Formik's render-prop (and outside the wizard's own <form>
  // element) on purpose: it's called from CustomSectionModal, which -- like
  // every Modal -- renders a native <dialog><form method="dialog"> for its
  // close button. Nesting that inside our own <form> is invalid HTML
  // (forms can't nest); browsers silently mangle the parsed DOM when they
  // hit it, which broke every input on the page after the first render.
  // Keeping both modals as siblings of <Formik> (see JSX below) avoids that
  // entirely, so this helper -- and the section state it updates -- lives
  // up here rather than inside the form-rendering render-prop.
  const refetchSections = async () => {
    if (!assessmentId) return;
    try {
      const assessment = await getCompanyAssessment(assessmentId);
      const nextSections = assessment.sections.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        question_count:
          s.question_count ??
          (s.type === "MCQ"
            ? s.mcq_questions?.length
            : s.type === "CODING_TASK"
            ? s.coding_tasks?.length
            : s.open_ended_questions?.length) ??
          0,
      }));
      setSections(nextSections);
    } catch {
      // best-effort refresh; the recruiter can still see the section
      // they just added reflected on next successful fetch
    }
  };

  return (
    <>
      <Formik
        initialValues={detailsInitialValues}
        validationSchema={currentStep.validationSchema}
        onSubmit={async (values, { setSubmitting, setFieldError }) => {
          if (step === 0) {
            if (assessmentId) {
              // Details already saved -- just move on (no re-create on revisit).
              setStep(1);
              scrollToTop();
              setSubmitting(false);
              return;
            }
            const { skillsets, duration_minutes, passing_grade, ...rest } = values;
            const res = await createCompanyAssessment({
              ...rest,
              skillsets,
              duration_minutes: Number(duration_minutes),
              passing_grade: Number(passing_grade),
            });
            setSubmitting(false);
            if (!res.success) {
              handleFormSubmissionError(res.error, setFieldError, setAlert);
              return;
            }
            setAssessmentId(res.data.id);
            setStep(1);
            scrollToTop();
            return;
          }

          if (step === 1) {
            setSubmitting(false);
            if (sections.length === 0) {
              setAlert({
                title: "Error",
                message: "Add at least one test before continuing.",
                icon: "error",
              });
              return;
            }
            setStep(2);
            scrollToTop();
            return;
          }

          // Last step: publish.
          if (!assessmentId) {
            setSubmitting(false);
            return;
          }
          const res = await publishCompanyAssessment(assessmentId);
          setSubmitting(false);
          if (!res.success) {
            handleFormSubmissionError(res.error, setFieldError, setAlert);
            return;
          }
          setPublishedTitle(values.title);
          successModalRef.current?.showModal();
        }}
      >
        {({ handleSubmit, errors, touched, isSubmitting, values, handleChange }) => {
          return (
            <form
              onSubmit={handleSubmit}
              className="p-5 pb-10 rounded-b-lg md:border border-gray-200 flex flex-col gap-10 mb-3 bg-white"
            >
              <StepIndicator
                step={step}
                totalSteps={totalSteps}
                title={currentStep.title}
                description={currentStep.description}
              />

              {step === 0 && (
                <div className="flex flex-col gap-8">
                  <div className="flex-wrap md:flex justify-between gap-y-6">
                    <FormikField
                      name="title"
                      label="Assessment title"
                      value={values.title}
                      error={errors.title}
                      touched={touched.title}
                      className="md:w-[48%] [&_input]:w-full"
                    />
                    <FormikField
                      name="difficulty_level"
                      label="Difficulty level"
                      type="select"
                      value={values.difficulty_level}
                      error={errors.difficulty_level}
                      touched={touched.difficulty_level}
                      className="md:w-[48%]"
                      selectFieldProps={{
                        options: difficultyLevels.map(dl => ({ label: dl, value: dl.toUpperCase() })),
                      }}
                    />
                    <FormikField
                      name="skillsets"
                      label="Skill sets"
                      type="select"
                      value={values.skillsets}
                      error={errors.skillsets as string}
                      touched={touched.skillsets}
                      className="md:w-[48%]"
                      selectFieldProps={{
                        isMulti: true,
                        options: talentRoles.map(role => ({ label: role.title, value: role.id })),
                      }}
                    />
                    <FormikField
                      name="assessment_type"
                      label="Assessment type"
                      type="select"
                      value={values.assessment_type}
                      error={errors.assessment_type}
                      touched={touched.assessment_type}
                      className="md:w-[48%]"
                      selectFieldProps={{ options: assessmentTypeOptions }}
                    />
                    <FormikField
                      name="duration_minutes"
                      label="Duration (minutes)"
                      type="number"
                      value={values.duration_minutes}
                      error={errors.duration_minutes}
                      touched={touched.duration_minutes}
                      className="md:w-[48%]"
                    />
                    <FormikField
                      name="passing_grade"
                      label="Passing grade (%)"
                      type="number"
                      value={values.passing_grade}
                      error={errors.passing_grade}
                      touched={touched.passing_grade}
                      className="md:w-[48%]"
                    />
                    <FormikField
                      name="description"
                      label="Assessment description"
                      type="textarea"
                      value={values.description}
                      error={errors.description}
                      touched={touched.description}
                    />
                  </div>

                  <div className="border-t border-[#EAECF0] pt-6">
                    <label className="flex items-start gap-x-3 mb-4">
                      <input
                        type="checkbox"
                        name="show_results_to_candidate"
                        checked={values.show_results_to_candidate}
                        onChange={handleChange}
                        className="radio radio-primary radio-xs mt-1"
                      />
                      <div>
                        <p className="text-sm text-[#343A40]">Show results to candidate</p>
                        <p className="text-xs text-[#6C757D]">
                          If turned off, candidates won&apos;t see their score or pass/fail status after
                          submitting -- only you will.
                        </p>
                      </div>
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {booleanFields.map(field => (
                        <label key={field.name} className="flex items-start gap-x-3">
                          <input
                            type="checkbox"
                            name={field.name}
                            checked={values[field.name] as boolean}
                            onChange={handleChange}
                            className="radio radio-primary radio-xs mt-1"
                          />
                          <div>
                            <p className="text-sm text-[#343A40]">{field.label}</p>
                            <p className="text-xs text-[#6C757D]">{field.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && assessmentId && (
                <BundleLibraryStep
                  assessmentId={assessmentId}
                  talentRoles={talentRoles}
                  selectedSections={sections}
                  onSectionsChanged={refetchSections}
                />
              )}

              {step === 2 && <PreviewPublishStep values={values} sections={sections} />}

              <div className="flex items-center justify-between w-full pt-4 border-t border-[#EAECF0]">
                <Button
                  onClick={() => {
                    setStep(current => Math.max(0, current - 1));
                    setTimeout(scrollToTop, 100);
                  }}
                  disabled={step === 0}
                  color="primary"
                  variant="outline"
                  className="gap-2"
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" /> Previous
                </Button>
                <Button loading={isSubmitting} color="primary" className="text-white gap-2" type="submit">
                  {isSubmitting ? (
                    ""
                  ) : isLastStep ? (
                    <>
                      Publish Assessment <Send className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          );
        }}
      </Formik>

      {assessmentId && (
        <CustomSectionModal
          assessmentId={assessmentId}
          modalRef={customSectionModalRef}
          onAdded={refetchSections}
        />
      )}

      <PublishSuccessModal
        modalRef={successModalRef}
        assessmentId={assessmentId}
        title={publishedTitle}
        onDone={() => router.push(`/recruiter/dashboard/assessments/${assessmentId}`)}
      />
    </>
  );
};

export default CreateAssessmentForm;

const PublishSuccessModal = ({
  modalRef,
  assessmentId,
  title,
  onDone,
}: {
  modalRef: React.RefObject<HTMLDialogElement>;
  assessmentId: string | number | null;
  title: string;
  onDone: () => void;
}) => {
  if (!assessmentId) return null;
  return (
    <InviteCandidatesModal
      assessmentId={assessmentId}
      modalId="publish-assessment-success-modal"
      modalRef={modalRef}
      disableClose
      title="Assessment published"
      description={`"${title}" is ready. Invite candidates now, or do it later from the assessment's page.`}
      footer={
        <button onClick={onDone} className="btn flex-1">
          Go to assessment
        </button>
      }
    />
  );
};
