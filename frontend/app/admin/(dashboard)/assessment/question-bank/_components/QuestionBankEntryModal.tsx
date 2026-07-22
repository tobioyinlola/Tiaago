"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LuPencilLine, LuPlus } from "react-icons/lu";

import { ID, TalentQuestionBankEntry, TalentRole } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import Modal from "@/app/common/components/Modal";
import Button from "@/app/common/components/DaisyButton";
import { useAlert } from "@/app/common/store/useAlert";
import {
  createStaffQuestionBankEntry,
  updateStaffQuestionBankEntry,
} from "@/app/common/services/assessment";

type QuestionType = "MCQ" | "CODING_TASK" | "OPEN_ENDED";

const difficultyLevels = ["JUNIOR", "INTERMEDIATE", "SENIOR"];

const QuestionBankEntryModal = ({
  entry,
  roles,
}: {
  entry?: TalentQuestionBankEntry;
  roles: TalentRole[];
}) => {
  const router = useRouter();
  const setAlert = useAlert(s => s.setAlert);
  const modalRef = useRef<HTMLDialogElement>(null);
  const modalId = `question-bank-entry-modal-${entry?.id || "new"}`;

  const [type, setType] = useState<QuestionType>(entry?.question_type || "MCQ");
  const [roleId, setRoleId] = useState<ID | "">(entry?.role?.id ?? "");
  const [difficulty, setDifficulty] = useState(entry?.difficulty_level || "JUNIOR");

  const [mcqQuestion, setMcqQuestion] = useState(entry?.mcq_question?.question || "");
  const [mcqOptions, setMcqOptions] = useState<string[]>(
    entry?.mcq_question?.options.map(o => o.value) || ["", "", "", ""]
  );
  const [mcqCorrectIndex, setMcqCorrectIndex] = useState(
    entry?.mcq_question?.correct_option_index || 1
  );

  const [codingTitle, setCodingTitle] = useState(entry?.coding_task?.title || "");
  const [codingDescription, setCodingDescription] = useState(
    entry?.coding_task?.description || ""
  );
  const [codingConstraints, setCodingConstraints] = useState(
    entry?.coding_task?.constraints || ""
  );

  const [oeQuestion, setOeQuestion] = useState(entry?.open_ended_question?.question || "");
  const [oeGuidance, setOeGuidance] = useState(
    entry?.open_ended_question?.grading_guidance || ""
  );

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!roleId) {
      setAlert({ title: "Error", message: "Select a role.", icon: "error" });
      return;
    }
    const payload: Record<string, unknown> = { role_id: roleId, difficulty_level: difficulty };

    if (type === "MCQ") {
      if (!mcqQuestion.trim() || mcqOptions.some(o => !o.trim())) {
        setAlert({ title: "Error", message: "Fill in the question and all 4 options.", icon: "error" });
        return;
      }
      payload.mcq_question = {
        question: mcqQuestion,
        options: mcqOptions.map((value, i) => ({ value, index: i + 1 })),
        correct_option_index: mcqCorrectIndex,
      };
    } else if (type === "CODING_TASK") {
      if (!codingTitle.trim() || !codingDescription.trim()) {
        setAlert({ title: "Error", message: "Fill in the task title and description.", icon: "error" });
        return;
      }
      payload.coding_task = {
        title: codingTitle,
        description: codingDescription,
        difficulty_level: difficulty,
        constraints: codingConstraints || undefined,
      };
    } else {
      if (!oeQuestion.trim()) {
        setAlert({ title: "Error", message: "Fill in the question.", icon: "error" });
        return;
      }
      payload.open_ended_question = {
        question: oeQuestion,
        grading_guidance: oeGuidance || undefined,
      };
    }

    setSaving(true);
    const res = entry
      ? await updateStaffQuestionBankEntry(entry.id, payload)
      : await createStaffQuestionBankEntry(payload);
    setSaving(false);
    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    setAlert({ title: "Success", message: entry ? "Entry updated." : "Entry created.", icon: "success" });
    modalRef.current?.close();
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        className={cn("btn btn-sm", entry ? "btn-ghost min-h-fit h-fit px-1" : "btn-primary text-white")}
        onClick={() => modalRef.current?.showModal()}
      >
        {entry ? <LuPencilLine /> : (
          <>
            <LuPlus /> Add Question
          </>
        )}
      </button>

      <Modal id={modalId} modalRef={modalRef} scrollAreaClassName="max-h-[75vh]">
        <h2 className="text-xl font-semibold text-primaryBlack mb-4">
          {entry ? "Edit Question" : "Add Question"}
        </h2>

        <div className="flex gap-2 mb-4">
          {(["MCQ", "CODING_TASK", "OPEN_ENDED"] as QuestionType[]).map(t => (
            <button
              key={t}
              type="button"
              disabled={!!entry && entry.question_type !== t}
              onClick={() => setType(t)}
              className={cn(
                "flex-1 border rounded-lg px-3 py-2 text-sm font-medium border-[#EAECF0] disabled:opacity-40",
                type === t ? "bg-primary text-white border-primary" : "text-[#344054]"
              )}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
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
        </div>

        {type === "MCQ" && (
          <div className="space-y-2">
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="Question text"
              value={mcqQuestion}
              onChange={e => setMcqQuestion(e.target.value)}
            />
            {mcqOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  className="radio radio-primary radio-sm"
                  checked={mcqCorrectIndex === i + 1}
                  onChange={() => setMcqCorrectIndex(i + 1)}
                />
                <input
                  className="input input-bordered input-sm w-full"
                  value={opt}
                  onChange={e => {
                    const next = [...mcqOptions];
                    next[i] = e.target.value;
                    setMcqOptions(next);
                  }}
                  placeholder={`Option ${i + 1}`}
                />
              </div>
            ))}
          </div>
        )}

        {type === "CODING_TASK" && (
          <div className="space-y-2">
            <input
              className="input input-bordered w-full"
              placeholder="Task title"
              value={codingTitle}
              onChange={e => setCodingTitle(e.target.value)}
            />
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="Problem statement"
              value={codingDescription}
              onChange={e => setCodingDescription(e.target.value)}
            />
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="Constraints / function signature (optional)"
              value={codingConstraints}
              onChange={e => setCodingConstraints(e.target.value)}
            />
          </div>
        )}

        {type === "OPEN_ENDED" && (
          <div className="space-y-2">
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="Question the candidate will answer"
              value={oeQuestion}
              onChange={e => setOeQuestion(e.target.value)}
            />
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="Grading guidance for the recruiter/AI (optional)"
              value={oeGuidance}
              onChange={e => setOeGuidance(e.target.value)}
            />
          </div>
        )}

        <div className="modal-action">
          <Button type="button" color="primary" className="text-white flex-1" loading={saving} onClick={handleSave}>
            Save
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default QuestionBankEntryModal;
