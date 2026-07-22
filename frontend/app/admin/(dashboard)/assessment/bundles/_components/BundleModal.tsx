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

const questionTypeFilters = [
  { label: "All", value: "" },
  { label: "MCQ", value: "MCQ" },
  { label: "Coding", value: "CODING_TASK" },
  { label: "Open-ended", value: "OPEN_ENDED" },
] as const;

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
  const [typeFilter, setTypeFilter] = useState<(typeof questionTypeFilters)[number]["value"]>("");
  const [search, setSearch] = useState("");

  const selectedCountByType = {
    MCQ: questionBank.filter(q => q.question_type === "MCQ" && selectedIds.includes(q.id)).length,
    CODING_TASK: questionBank.filter(q => q.question_type === "CODING_TASK" && selectedIds.includes(q.id)).length,
    OPEN_ENDED: questionBank.filter(q => q.question_type === "OPEN_ENDED" && selectedIds.includes(q.id)).length,
  };

  const visibleQuestions = questionBank.filter(entry => {
    if (typeFilter && entry.question_type !== typeFilter) return false;
    if (search.trim() && !questionLabel(entry).toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

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

        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <p className="text-sm font-medium text-[#344054]">
            Questions ({selectedIds.length} selected -- {selectedCountByType.MCQ} MCQ,{" "}
            {selectedCountByType.CODING_TASK} coding, {selectedCountByType.OPEN_ENDED} open-ended)
          </p>
        </div>

        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {questionTypeFilters.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setTypeFilter(f.value)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium border",
                typeFilter === f.value
                  ? "bg-primary text-white border-primary"
                  : "border-[#D0D5DD] text-[#344054]"
              )}
            >
              {f.label}
            </button>
          ))}
          <input
            className="input input-bordered input-sm flex-1 min-w-[160px]"
            placeholder="Search questions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="border border-[#EAECF0] rounded-lg max-h-64 overflow-y-auto divide-y divide-[#EAECF0]">
          {questionBank.length === 0 ? (
            <p className="p-3 text-sm text-[#9DA3A8]">
              No question bank entries yet -- add some first.
            </p>
          ) : visibleQuestions.length === 0 ? (
            <p className="p-3 text-sm text-[#9DA3A8]">No questions match this filter.</p>
          ) : (
            visibleQuestions.map(entry => (
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
