"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, FileQuestion } from "lucide-react";

import SlidePanel from "@/app/common/components/SlidePanel";
import { cn } from "@/app/common/utils";
import { AssessmentQuestionSection, CompanySkillAssessment, TalentRole } from "@/app/common/types";
import { getTalentRoles } from "@/app/common/services";
import {
  getCompanyAssessment,
  getCompanyAssessments,
  getBundleMcqQuestions,
  listAssessmentBundles,
} from "@/app/common/services/assessment";
import type { AssessmentBundleSummary } from "@/app/common/types";

type Tab = "assessments" | "bundles";

const AssessmentSourcePicker = ({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (sections: AssessmentQuestionSection[]) => void;
}) => {
  const [tab, setTab] = useState<Tab>("assessments");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | number | null>(null);

  const [assessments, setAssessments] = useState<CompanySkillAssessment[]>([]);
  const [bundles, setBundles] = useState<AssessmentBundleSummary[]>([]);
  const [roles, setRoles] = useState<TalentRole[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    getTalentRoles().then(setRoles).catch(() => setRoles([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // react-hooks/set-state-in-effect forbids setState as a direct
    // synchronous statement in an effect body -- defer to a microtask so
    // the update happens inside a callback instead (fires before the fetch
    // below can possibly resolve, so no visible behavior change).
    queueMicrotask(() => setLoading(true));
    if (tab === "assessments") {
      getCompanyAssessments(1, 50)
        .then(res =>
          setAssessments(res.results.filter(a => a.published))
        )
        .catch(() => setAssessments([]))
        .finally(() => setLoading(false));
    } else {
      listAssessmentBundles(roleFilter ? { role: roleFilter } : undefined)
        .then(res => setBundles(res.results))
        .catch(() => setBundles([]))
        .finally(() => setLoading(false));
    }
  }, [open, tab, roleFilter]);

  const mcqQuestionCount = (assessment: CompanySkillAssessment) =>
    assessment.sections
      .filter(s => s.type === "MCQ")
      .reduce((sum, s) => sum + (s.mcq_questions?.length || 0), 0);

  // The skill-assessment system (bundles, CompanySkillAssessment) uses
  // 1-based option indices/correct_option_index (see
  // GeneralSkillAssessmentMCQQuestion). The job wizard's own assessment
  // template is 0-based instead (see AIService.get_categorized_mcq_questions,
  // which builds correct_option_index from a 0-based Python enumerate/.index()
  // call) -- shift both down by one when crossing from one system to the
  // other, or the wizard ends up highlighting the wrong option as correct.
  const toWizardMCQQuestion = (q: {
    question: string;
    options: { index: number; value?: string; label?: string }[];
    correct_option_index: number;
    is_ai_generated?: boolean;
  }) => ({
    question: q.question,
    options: q.options.map(o => ({ index: o.index - 1, value: (o.value ?? o.label)! })),
    correct_option_index: q.correct_option_index - 1,
    is_ai_generated: q.is_ai_generated,
  });

  const handlePickAssessment = async (assessment: CompanySkillAssessment) => {
    setApplying(assessment.id);
    const full = await getCompanyAssessment(assessment.id).catch(() => null);
    setApplying(null);
    if (!full) {
      toast.error("Failed to load that assessment");
      return;
    }
    const mcqSections = full.sections.filter(s => s.type === "MCQ" && s.mcq_questions?.length);
    if (!mcqSections.length) {
      toast.error("That assessment has no multiple-choice questions to reuse");
      return;
    }
    onSelect(
      mcqSections.map(s => ({
        category: s.name,
        questions: (s.mcq_questions || []).map(toWizardMCQQuestion),
      }))
    );
    toast.success(`Loaded questions from "${full.title}"`);
    onClose();
  };

  const handlePickBundle = async (bundle: AssessmentBundleSummary) => {
    setApplying(bundle.id);
    const res = await getBundleMcqQuestions(bundle.id);
    setApplying(null);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    if (!res.data.questions.length) {
      toast.error("That bundle has no multiple-choice questions to reuse");
      return;
    }
    onSelect([
      { category: res.data.name, questions: res.data.questions.map(toWizardMCQQuestion) },
    ]);
    toast.success(`Loaded questions from "${res.data.name}"`);
    onClose();
  };

  return (
    <SlidePanel
      id="assessment-source-picker"
      open={open}
      onClose={onClose}
      title="Use an existing question source"
      className="max-w-2xl"
    >
      <div className="flex gap-1 rounded-lg bg-muted p-1 mb-5 w-fit">
        {(
          [
            ["assessments", "My Assessments"],
            ["bundles", "Question Bank"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              tab === value
                ? "bg-white text-primary shadow-sm"
                : "text-secondary-black hover:text-primary-black"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "bundles" && (
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="select select-bordered select-sm w-full mb-4"
        >
          <option value="">All roles</option>
          {roles.map(role => (
            <option key={role.id} value={role.id}>
              {role.title}
            </option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-secondary-black">Loading...</p>
        </div>
      ) : tab === "assessments" ? (
        assessments.length === 0 ? (
          <p className="text-sm text-secondary-black text-center py-16">
            You don&apos;t have any published assessments yet.
          </p>
        ) : (
          <div className="space-y-3">
            {assessments.map(assessment => (
              <div
                key={assessment.id}
                className="border border-[#EAECF0] rounded-lg p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-primaryBlack truncate">{assessment.title}</p>
                  <p className="text-xs text-secondary-black mt-0.5">
                    {mcqQuestionCount(assessment)} MCQ question
                    {mcqQuestionCount(assessment) !== 1 ? "s" : ""} &middot;{" "}
                    {assessment.difficulty_level}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={applying === assessment.id}
                  onClick={() => handlePickAssessment(assessment)}
                  className="btn btn-sm btn-outline gap-1.5 shrink-0"
                >
                  {applying === assessment.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileQuestion className="w-3.5 h-3.5" />
                  )}
                  Use this
                </button>
              </div>
            ))}
          </div>
        )
      ) : bundles.length === 0 ? (
        <p className="text-sm text-secondary-black text-center py-16">
          No bundles found for this filter.
        </p>
      ) : (
        <div className="space-y-3">
          {bundles.map(bundle => (
            <div
              key={bundle.id}
              className="border border-[#EAECF0] rounded-lg p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-primaryBlack truncate">{bundle.name}</p>
                <p className="text-xs text-secondary-black mt-0.5">
                  {bundle.role.title} &middot; {bundle.difficulty_level} &middot;{" "}
                  {bundle.question_count} questions
                </p>
              </div>
              <button
                type="button"
                disabled={applying === bundle.id}
                onClick={() => handlePickBundle(bundle)}
                className="btn btn-sm btn-outline gap-1.5 shrink-0"
              >
                {applying === bundle.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileQuestion className="w-3.5 h-3.5" />
                )}
                Use this
              </button>
            </div>
          ))}
        </div>
      )}
    </SlidePanel>
  );
};

export default AssessmentSourcePicker;
