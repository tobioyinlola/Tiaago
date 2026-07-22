"use client";

import { useEffect, useState } from "react";
import { LuPlus, LuClock, LuLayers } from "react-icons/lu";

import { AssessmentBundleSummary, ID, TalentRole } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import Button from "@/app/common/components/DaisyButton";
import { useAlert } from "@/app/common/store/useAlert";
import { addBundleToAssessment, listAssessmentBundles } from "@/app/common/services/assessment";
import { customSectionModalId } from "./CustomSectionModal";

export type SelectedSection = { id: ID; name: string; type: string; question_count: number };

const BundleLibraryStep = ({
  assessmentId,
  talentRoles,
  selectedSections,
  onSectionsChanged,
}: {
  assessmentId: ID;
  talentRoles: TalentRole[];
  selectedSections: SelectedSection[];
  onSectionsChanged: () => void;
}) => {
  const setAlert = useAlert(s => s.setAlert);
  const [bundles, setBundles] = useState<AssessmentBundleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<ID | "">("");
  const [addingId, setAddingId] = useState<ID | null>(null);

  useEffect(() => {
    setLoading(true);
    listAssessmentBundles(roleFilter ? { role: roleFilter } : undefined)
      .then(res => setBundles(res.results))
      .catch(err => setAlert({ title: "Error", message: String(err?.message || err), icon: "error" }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  const handleAddBundle = async (bundle: AssessmentBundleSummary) => {
    setAddingId(bundle.id);
    const res = await addBundleToAssessment(assessmentId, bundle.id);
    setAddingId(null);
    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    onSectionsChanged();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-primaryBlack">Test Library</h3>
          <select
            className="select select-bordered select-sm"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="">All roles</option>
            {talentRoles.map(role => (
              <option key={role.id} value={role.id}>
                {role.title}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : bundles.length === 0 ? (
          <p className="text-sm text-[#9DA3A8] py-8 text-center border border-dashed border-[#EAECF0] rounded-lg">
            No recommended tests for this role yet -- build a custom test instead.
          </p>
        ) : (
          <div className="space-y-3">
            {bundles.map(bundle => (
              <div
                key={bundle.id}
                className="border border-[#EAECF0] rounded-lg p-4 flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-primaryBlack">{bundle.name}</p>
                    {bundle.is_recommended && (
                      <span className="text-xs font-medium px-2 py-[2px] bg-[#F1F3FF] text-primary rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#9DA3A8] mb-2">{bundle.description}</p>
                  <div className="flex items-center gap-4 text-xs text-[#6C757D]">
                    <span className="flex items-center gap-1">
                      <LuClock /> {bundle.estimated_duration_minutes}m
                    </span>
                    <span className="flex items-center gap-1">
                      <LuLayers /> {bundle.question_count} questions
                    </span>
                    <span>{bundle.role.title}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  color="primary"
                  variant="outline"
                  size="sm"
                  className="gap-1 shrink-0"
                  loading={addingId === bundle.id}
                  onClick={() => handleAddBundle(bundle)}
                >
                  <LuPlus /> Add
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-[#EAECF0] pt-6">
          <Button
            type="button"
            color="primary"
            className="text-white gap-2"
            onClick={() => (document.getElementById(customSectionModalId) as HTMLDialogElement)?.showModal()}
          >
            <LuPlus /> Create Custom Test
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-primaryBlack mb-4">Selected Tests</h3>
        {selectedSections.length === 0 ? (
          <p className="text-sm text-[#9DA3A8] border border-dashed border-[#EAECF0] rounded-lg p-4 text-center">
            Nothing added yet. Add a test from the library or create a custom one.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedSections.map(section => (
              <div
                key={section.id}
                className={cn(
                  "border border-[#EAECF0] rounded-lg px-3 py-2 flex items-center justify-between"
                )}
              >
                <div>
                  <p className="text-sm font-medium text-primaryBlack">{section.name}</p>
                  <p className="text-xs text-[#9DA3A8]">
                    {section.type.replace("_", " ")} -- {section.question_count} question
                    {section.question_count === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BundleLibraryStep;
