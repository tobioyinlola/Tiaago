"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuPlus } from "react-icons/lu";

import { TalentRole } from "@/app/common/types";
import Button from "@/app/common/components/DaisyButton";
import SlidePanel from "@/app/common/components/SlidePanel";
import { useAlert } from "@/app/common/store/useAlert";
import { createStaffQuestionBankEntry } from "@/app/common/services/assessment";

type QuestionType = "MCQ" | "CODING_TASK" | "OPEN_ENDED";

const questionTypeLabels: Record<QuestionType, string> = {
  MCQ: "Multiple Choice",
  CODING_TASK: "Coding Task",
  OPEN_ENDED: "Open-Ended",
};
const questionTypes = Object.keys(questionTypeLabels) as QuestionType[];
const difficultyLevels = ["JUNIOR", "INTERMEDIATE", "SENIOR"];

const AddQuestionModal = ({ roles }: { roles: TalentRole[] }) => {
  const router = useRouter();
  const setAlert = useAlert(s => s.setAlert);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<QuestionType>("MCQ");
  const [roleId, setRoleId] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("JUNIOR");

  // MCQ
  const [mcqQuestion, setMcqQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(1);

  // Coding task
  const [codingTitle, setCodingTitle] = useState("");
  const [codingDescription, setCodingDescription] = useState("");
  const [codingConstraints, setCodingConstraints] = useState("");

  // Open-ended
  const [oeQuestion, setOeQuestion] = useState("");
  const [oeGradingGuidance, setOeGradingGuidance] = useState("");

  const reset = () => {
    setType("MCQ");
    setRoleId("");
    setDifficultyLevel("JUNIOR");
    setMcqQuestion("");
    setOptions(["", "", "", ""]);
    setCorrectOptionIndex(1);
    setCodingTitle("");
    setCodingDescription("");
    setCodingConstraints("");
    setOeQuestion("");
    setOeGradingGuidance("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let payload: Record<string, unknown>;
    if (type === "MCQ") {
      const nonEmpty = options.filter(o => o.trim());
      if (!mcqQuestion.trim() || nonEmpty.length < 2) {
        setAlert({ title: "Error", message: "Add a question and at least 2 options.", icon: "error" });
        return;
      }
      payload = {
        mcq_question: {
          question: mcqQuestion.trim(),
          options: options
            .map((value, i) => ({ value: value.trim(), index: i + 1 }))
            .filter(o => o.value),
          correct_option_index: correctOptionIndex,
        },
      };
    } else if (type === "CODING_TASK") {
      if (!codingTitle.trim() || !codingDescription.trim()) {
        setAlert({ title: "Error", message: "Add a title and description.", icon: "error" });
        return;
      }
      payload = {
        coding_task: {
          title: codingTitle.trim(),
          description: codingDescription.trim(),
          difficulty_level: difficultyLevel,
          constraints: codingConstraints.trim() || undefined,
        },
      };
    } else {
      if (!oeQuestion.trim()) {
        setAlert({ title: "Error", message: "Add a question.", icon: "error" });
        return;
      }
      payload = {
        open_ended_question: {
          question: oeQuestion.trim(),
          grading_guidance: oeGradingGuidance.trim() || undefined,
        },
      };
    }
    payload.difficulty_level = difficultyLevel;
    if (roleId) payload.role_id = roleId;

    setSubmitting(true);
    const res = await createStaffQuestionBankEntry(payload);
    setSubmitting(false);

    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    setAlert({ title: "Success", message: "Question added.", icon: "success" });
    reset();
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button color="primary" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
        <LuPlus className="w-4 h-4" />
        Add Question
      </Button>

      <SlidePanel id="add-question-panel" open={open} onClose={() => setOpen(false)} title="Add Question" className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-2">
            {questionTypes.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 border rounded-lg px-3 py-2 text-sm font-medium border-border ${
                  type === t ? "bg-primary text-white border-primary" : "text-secondary-black"
                }`}
              >
                {questionTypeLabels[t]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text text-black font-medium font-onest mb-1 block">Role (optional)</label>
              <select value={roleId} onChange={e => setRoleId(e.target.value)} className="select select-bordered w-full">
                <option value="">No specific role</option>
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
                className="select select-bordered w-full"
              >
                {difficultyLevels.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {type === "MCQ" && (
            <div className="space-y-3">
              <div>
                <label className="label-text text-black font-medium font-onest mb-1 block">Question</label>
                <textarea
                  value={mcqQuestion}
                  onChange={e => setMcqQuestion(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  rows={2}
                />
              </div>
              {options.map((option, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct-option"
                    checked={correctOptionIndex === i + 1}
                    onChange={() => setCorrectOptionIndex(i + 1)}
                    className="radio radio-sm radio-primary"
                    aria-label={`Option ${i + 1} is correct`}
                  />
                  <input
                    value={option}
                    onChange={e => setOptions(opts => opts.map((o, idx) => (idx === i ? e.target.value : o)))}
                    className="input input-bordered input-sm w-full"
                    placeholder={`Option ${i + 1}`}
                  />
                </div>
              ))}
              <p className="text-[11px] text-secondary-black">Select the radio button next to the correct option.</p>
            </div>
          )}

          {type === "CODING_TASK" && (
            <div className="space-y-3">
              <div>
                <label className="label-text text-black font-medium font-onest mb-1 block">Title</label>
                <input
                  value={codingTitle}
                  onChange={e => setCodingTitle(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="e.g. Reverse a linked list"
                />
              </div>
              <div>
                <label className="label-text text-black font-medium font-onest mb-1 block">Description</label>
                <textarea
                  value={codingDescription}
                  onChange={e => setCodingDescription(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  rows={4}
                  placeholder="The problem statement"
                />
              </div>
              <div>
                <label className="label-text text-black font-medium font-onest mb-1 block">
                  Constraints (optional)
                </label>
                <textarea
                  value={codingConstraints}
                  onChange={e => setCodingConstraints(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  rows={2}
                />
              </div>
            </div>
          )}

          {type === "OPEN_ENDED" && (
            <div className="space-y-3">
              <div>
                <label className="label-text text-black font-medium font-onest mb-1 block">Question</label>
                <textarea
                  value={oeQuestion}
                  onChange={e => setOeQuestion(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  placeholder="e.g. Describe a time you had to debug a production incident."
                />
              </div>
              <div>
                <label className="label-text text-black font-medium font-onest mb-1 block">
                  Grading guidance (optional)
                </label>
                <textarea
                  value={oeGradingGuidance}
                  onChange={e => setOeGradingGuidance(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  placeholder="What should a strong answer include?"
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn btn-primary text-white w-full">
            {submitting ? "Adding..." : "Add Question"}
          </button>
        </form>
      </SlidePanel>
    </>
  );
};

export default AddQuestionModal;
