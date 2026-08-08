"use client";

import { LuClock, LuLayers, LuEye, LuEyeOff } from "react-icons/lu";

import { DetailsFormValues } from "../wizard.constants";
import { SelectedSection } from "./BundleLibraryStep";

const PreviewPublishStep = ({
  values,
  sections,
}: {
  values: DetailsFormValues;
  sections: SelectedSection[];
}) => {
  const totalQuestions = sections.reduce((acc, s) => acc + (s.question_count || 0), 0);
  // The backend auto-promotes assessment_type to MIXED the moment more
  // than one section type is actually present (see
  // skill_assessment.views._promote_to_mixed_if_needed) -- deriving the
  // badge from the real sections here keeps it accurate even before that
  // refetch lands, instead of trusting values.assessment_type, which only
  // ever reflects what was picked at creation.
  const distinctSectionTypes = new Set(sections.map(s => s.type));
  const displayedType =
    distinctSectionTypes.size > 1 ? "MIXED" : sections[0]?.type ?? values.assessment_type;

  return (
    <div className="border border-[#EAECF0] rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-primaryBlack">{values.title || "Untitled assessment"}</h3>
          <p className="text-sm text-[#9DA3A8] mt-1">{values.description}</p>
        </div>
        <span className="text-xs font-medium px-2 py-[2px] bg-[#F1F3FF] text-primary rounded-full shrink-0">
          {displayedType}
        </span>
      </div>

      <div className="flex items-center gap-6 text-sm text-[#6C757D] mb-6">
        <span className="flex items-center gap-1">
          <LuClock /> {values.duration_minutes} minutes
        </span>
        <span className="flex items-center gap-1">
          <LuLayers /> {totalQuestions} question{totalQuestions === 1 ? "" : "s"} across {sections.length} section
          {sections.length === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-1">
          {values.show_results_to_candidate ? <LuEye /> : <LuEyeOff />}
          {values.show_results_to_candidate ? "Candidates see results" : "Results hidden from candidates"}
        </span>
      </div>

      <div className="space-y-2">
        {sections.map(section => (
          <div
            key={section.id}
            className="flex items-center justify-between border border-[#EAECF0] rounded-lg px-4 py-3"
          >
            <p className="text-sm font-medium text-primaryBlack">{section.name}</p>
            <p className="text-xs text-[#9DA3A8]">
              {section.type.replace("_", " ")} -- {section.question_count} question
              {section.question_count === 1 ? "" : "s"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-[#EAECF0] text-sm text-[#6C757D]">
        <p>Passing grade: {values.passing_grade}%</p>
        <p className="mt-1">
          Once published, this assessment can be sent to candidates by email invite. You&apos;ll be able to
          add more invites any time from the assessment&apos;s page.
        </p>
      </div>
    </div>
  );
};

export default PreviewPublishStep;
