"use client";

import { useState } from "react";
import { Clock, Code2, Eye, FileQuestion, Languages, Loader2, PenLine } from "lucide-react";

import SlidePanel from "@/app/common/components/SlidePanel";
import { useAlert } from "@/app/common/store/useAlert";
import { AssessmentBundlePreview, AssessmentBundleSummary } from "@/app/common/types";
import { previewAssessmentBundle } from "@/app/common/services/assessment";

const typeMeta = {
  MCQ: { label: "Multiple choice", Icon: FileQuestion },
  CODING_TASK: { label: "Coding task", Icon: Code2 },
  OPEN_ENDED: { label: "Open-ended", Icon: PenLine },
} as const;

const BundleCard = (bundle: AssessmentBundleSummary) => {
  const setAlert = useAlert(s => s.setAlert);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<AssessmentBundlePreview | null>(null);

  const openPreview = async () => {
    setOpen(true);
    if (preview) return;
    setLoading(true);
    const res = await previewAssessmentBundle(bundle.id);
    setLoading(false);
    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      setOpen(false);
      return;
    }
    setPreview(res.data);
  };

  return (
    <div className="border border-[#EAECF0] rounded-lg p-5 bg-white flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <p className="font-semibold text-primaryBlack">{bundle.name}</p>
        {bundle.is_recommended && (
          <span className="text-xs font-medium px-2 py-[2px] bg-[#F1F3FF] text-primary rounded-full">
            Recommended
          </span>
        )}
      </div>
      <p className="text-sm text-[#9DA3A8] mb-3 flex-1">{bundle.description}</p>
      <div className="flex items-center gap-4 text-xs text-[#6C757D] mb-4">
        <span>{bundle.role.title}</span>
        <span>{bundle.difficulty_level}</span>
        <span>{bundle.estimated_duration_minutes}m</span>
        <span>{bundle.question_count} questions</span>
      </div>
      <button
        type="button"
        onClick={openPreview}
        className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary border border-primary/30 rounded-lg py-2 hover:bg-primary/5 transition-colors"
      >
        <Eye className="w-4 h-4" />
        Preview
      </button>

      <SlidePanel
        id={`bundle-preview-${bundle.id}`}
        open={open}
        onClose={() => setOpen(false)}
        title={bundle.name}
        className="max-w-2xl"
      >
        {loading || !preview ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-secondary-black">Loading preview...</p>
          </div>
        ) : (
          <div>
            {preview.is_recommended && (
              <span className="inline-block text-xs font-medium px-2 py-[2px] bg-[#F1F3FF] text-primary rounded-full mb-2">
                Recommended
              </span>
            )}
            <div className="flex gap-2 flex-wrap mb-4">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F5F6F7] text-secondary-black">
                {preview.role.title}
              </span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F5F6F7] text-secondary-black capitalize">
                {preview.difficulty_level.toLowerCase()}
              </span>
            </div>

            <p className="text-sm text-secondary-black mb-5">{preview.description}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              <div className="rounded-lg border border-[#EAECF0] p-3 text-center">
                <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-sm font-semibold text-primaryBlack">{preview.estimated_duration_minutes}m</p>
                <p className="text-[11px] text-secondary-black">Duration</p>
              </div>
              <div className="rounded-lg border border-[#EAECF0] p-3 text-center">
                <FileQuestion className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-sm font-semibold text-primaryBlack">{preview.question_count}</p>
                <p className="text-[11px] text-secondary-black">Questions</p>
              </div>
              <div className="rounded-lg border border-[#EAECF0] p-3 text-center">
                <Languages className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-sm font-semibold text-primaryBlack">
                  {preview.languages.length ? preview.languages.join(", ") : "--"}
                </p>
                <p className="text-[11px] text-secondary-black">Language</p>
              </div>
            </div>

            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary-black mb-2">
                Question mix
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(typeMeta) as (keyof typeof typeMeta)[]).map(type => {
                  const count = preview.question_type_breakdown[type];
                  if (!count) return null;
                  const { label, Icon } = typeMeta[type];
                  return (
                    <span
                      key={type}
                      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#F5F6F7] text-secondary-black"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {count} {label}
                    </span>
                  );
                })}
              </div>
            </div>

            {preview.sample_questions.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary-black mb-2">
                  Sample questions
                </p>
                <div className="space-y-3">
                  {preview.sample_questions.map((q, i) => {
                    const { label, Icon } = typeMeta[q.type];
                    return (
                      <div key={i} className="rounded-lg border border-[#EAECF0] p-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-secondary-black mb-1.5">
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </div>
                        <p className="text-sm text-primaryBlack">{q.question}</p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-secondary-black italic mt-3">
                  Showing a preview only -- the full question bank is revealed once this bundle is added to your
                  assessment.
                </p>
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  );
};

export default BundleCard;
