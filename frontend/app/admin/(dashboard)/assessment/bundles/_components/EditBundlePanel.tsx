"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlinePencil } from "react-icons/hi";

import { AssessmentBundleAdmin, TalentRole } from "@/app/common/types";
import SlidePanel from "@/app/common/components/SlidePanel";
import { useAlert } from "@/app/common/store/useAlert";
import { updateStaffBundle } from "@/app/common/services/assessment";

const difficultyLevels = ["JUNIOR", "INTERMEDIATE", "SENIOR"];

const EditBundlePanel = ({
  bundle,
  roles,
}: {
  bundle: AssessmentBundleAdmin;
  roles: TalentRole[];
}) => {
  const router = useRouter();
  const setAlert = useAlert(s => s.setAlert);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState(bundle.name);
  const [roleId, setRoleId] = useState(String(bundle.role?.id ?? ""));
  const [difficultyLevel, setDifficultyLevel] = useState(bundle.difficulty_level);
  const [duration, setDuration] = useState(bundle.estimated_duration_minutes);
  const [description, setDescription] = useState(bundle.description);
  const [isRecommended, setIsRecommended] = useState(bundle.is_recommended);
  const [active, setActive] = useState(bundle.active);

  const handleOpen = () => {
    setName(bundle.name);
    setRoleId(String(bundle.role?.id ?? ""));
    setDifficultyLevel(bundle.difficulty_level);
    setDuration(bundle.estimated_duration_minutes);
    setDescription(bundle.description);
    setIsRecommended(bundle.is_recommended);
    setActive(bundle.active);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setSubmitting(true);
    const res = await updateStaffBundle(bundle.id, {
      name,
      role_id: roleId,
      difficulty_level: difficultyLevel,
      estimated_duration_minutes: duration,
      description,
      is_recommended: isRecommended,
      active,
    });
    setSubmitting(false);

    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    setAlert({ title: "Success", message: "Bundle updated.", icon: "success" });
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost min-h-fit h-fit px-1"
        onClick={handleOpen}
        aria-label="Edit bundle"
      >
        <HiOutlinePencil className="text-secondary-black" />
      </button>

      <SlidePanel
        id={`bundle-edit-panel-${bundle.id}`}
        open={open}
        onClose={() => setOpen(false)}
        title="Edit Assessment Bundle"
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text text-black font-medium font-onest mb-1 block">Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="input input-bordered w-full"
                placeholder="e.g. Backend Engineer (Junior)"
              />
            </div>
            <div>
              <label className="label-text text-black font-medium font-onest mb-1 block">Role</label>
              <select
                value={roleId}
                onChange={e => setRoleId(e.target.value)}
                required
                className="select select-bordered w-full"
              >
                <option value="">Select a role</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text text-black font-medium font-onest mb-1 block">Difficulty</label>
              <select
                value={difficultyLevel}
                onChange={e => setDifficultyLevel(e.target.value)}
                required
                className="select select-bordered w-full"
              >
                {difficultyLevels.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text text-black font-medium font-onest mb-1 block">Duration (minutes)</label>
              <input
                type="number"
                min={1}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                required
                className="input input-bordered w-full"
              />
            </div>
          </div>

          <div>
            <label className="label-text text-black font-medium font-onest mb-1 block">Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="textarea textarea-bordered w-full"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecommended}
                onChange={e => setIsRecommended(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm text-secondary-black">Mark as recommended</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={e => setActive(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm text-secondary-black">Active</span>
            </label>
          </div>

          <p className="text-xs text-secondary-black">
            This form edits the bundle&apos;s details only -- its question set stays
            unchanged. Delete and re-create the bundle to change which questions it contains.
          </p>

          <button type="submit" disabled={submitting} className="btn btn-primary text-white w-full">
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </SlidePanel>
    </>
  );
};

export default EditBundlePanel;
