"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LuPencilLine, LuPlus } from "react-icons/lu";

import { AssessmentBundleAdmin, ID, TalentQuestionBankEntry, TalentRole } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import Modal from "@/app/common/components/Modal";
import Button from "@/app/common/components/DaisyButton";
import { useAlert } from "@/app/common/store/useAlert";
import { createStaffBundle, updateStaffBundle } from "@/app/common/services/assessment";

const difficultyLevels = ["JUNIOR", "INTERMEDIATE", "SENIOR"];

const questionLabel = (entry: TalentQuestionBankEntry) => {
  if (entry.question_type === "MCQ") return entry.mcq_question?.question || "";
  if (entry.question_type === "CODING_TASK") return entry.coding_task?.title || "";
  return entry.open_ended_question?.question || "";
};

const BundleModal = ({
  bundle,
  roles,
  questionBank,
}: {
  bundle?: AssessmentBundleAdmin;
  roles: TalentRole[];
  questionBank: TalentQuestionBankEntry[];
}) => {
  const router = useRouter();
  const setAlert = useAlert(s => s.setAlert);
  const modalRef = useRef<HTMLDialogElement>(null);
  const modalId = `bundle-modal-${bundle?.id || "new"}`;

  const [name, setName] = useState(bundle?.name || "");
  const [description, setDescription] = useState(bundle?.description || "");
  const [roleId, setRoleId] = useState<ID | "">(bundle?.role?.id ?? "");
  const [difficulty, setDifficulty] = useState(bundle?.difficulty_level || "JUNIOR");
  const [duration, setDuration] = useState(bundle?.estimated_duration_minutes ?? 30);
  const [isRecommended, setIsRecommended] = useState(bundle?.is_recommended ?? false);
  const [selectedIds, setSelectedIds] = useState<ID[]>(
    bundle?.bank_questions.map(q => q.id) || []
  );
  const [saving, setSaving] = useState(false);

  const toggleQuestion = (id: ID) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !roleId) {
      setAlert({ title: "Error", message: "Name and role are required.", icon: "error" });
      return;
    }
    const payload = {
      name,
      description,
      role_id: roleId,
      difficulty_level: difficulty,
      estimated_duration_minutes: Number(duration),
      is_recommended: isRecommended,
      bank_question_ids: selectedIds,
    };
    setSaving(true);
    const res = bundle
      ? await updateStaffBundle(bundle.id, payload)
      : await createStaffBundle(payload);
    setSaving(false);
    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    setAlert({ title: "Success", message: bundle ? "Bundle updated." : "Bundle created.", icon: "success" });
    modalRef.current?.close();
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        className={cn("btn btn-sm", bundle ? "btn-ghost min-h-fit h-fit px-1" : "btn-primary text-white")}
        onClick={() => modalRef.current?.showModal()}
      >
        {bundle ? <LuPencilLine /> : (
          <>
            <LuPlus /> Add Bundle
          </>
        )}
      </button>

      <Modal id={modalId} modalRef={modalRef} scrollAreaClassName="max-h-[75vh]">
        <h2 className="text-xl font-semibold text-primaryBlack mb-4">
          {bundle ? "Edit Bundle" : "Add Bundle"}
        </h2>

        <div className="space-y-3 mb-4">
          <input
            className="input input-bordered w-full"
            placeholder="Bundle name (e.g. Backend Engineer (Junior))"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <textarea
            className="textarea textarea-bordered w-full"
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-3">
            <select
              className="select select-bordered select-sm"
              value={roleId}
              onChange={e => setRoleId(e.target.value)}
            >
              <option value="">Select role...</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.title}
                </option>
              ))}
            </select>
            <select
              className="select select-bordered select-sm"
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
            >
              {difficultyLevels.map(dl => (
                <option key={dl} value={dl}>
                  {dl}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="input input-bordered input-sm"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              placeholder="Duration (min)"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={isRecommended}
              onChange={e => setIsRecommended(e.target.checked)}
            />
            Recommended
          </label>
        </div>

        <p className="text-sm font-medium text-[#344054] mb-2">
          Questions ({selectedIds.length} selected)
        </p>
        <div className="border border-[#EAECF0] rounded-lg max-h-64 overflow-y-auto divide-y divide-[#EAECF0]">
          {questionBank.length === 0 ? (
            <p className="p-3 text-sm text-[#9DA3A8]">
              No question bank entries yet -- add some first.
            </p>
          ) : (
            questionBank.map(entry => (
              <label key={entry.id} className="flex items-start gap-2 p-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm mt-0.5"
                  checked={selectedIds.includes(entry.id)}
                  onChange={() => toggleQuestion(entry.id)}
                />
                <span>
                  <span className="font-medium">{entry.question_type?.replace("_", " ")}</span> --{" "}
                  {questionLabel(entry)}
                </span>
              </label>
            ))
          )}
        </div>

        <div className="modal-action">
          <Button type="button" color="primary" className="text-white flex-1" loading={saving} onClick={handleSave}>
            Save
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default BundleModal;
