"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuSparkles } from "react-icons/lu";

import { TalentRole } from "@/app/common/types";
import Button from "@/app/common/components/DaisyButton";
import SlidePanel from "@/app/common/components/SlidePanel";
import { useAlert } from "@/app/common/store/useAlert";
import { generateStaffQuestionBankQuestions } from "@/app/common/services/assessment";

type QuestionType = "MCQ" | "CODING_TASK";

const questionTypeLabels: Record<QuestionType, string> = {
  MCQ: "Multiple Choice",
  CODING_TASK: "Coding Task",
};
const questionTypes = Object.keys(questionTypeLabels) as QuestionType[];
const difficultyLevels = ["JUNIOR", "INTERMEDIATE", "SENIOR"];

const GenerateQuestionsModal = ({ roles }: { roles: TalentRole[] }) => {
  const router = useRouter();
  const setAlert = useAlert(s => s.setAlert);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<QuestionType>("MCQ");
  const [topic, setTopic] = useState("");
  const [roleId, setRoleId] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("JUNIOR");
  const [count, setCount] = useState(5);

  const reset = () => {
    setType("MCQ");
    setTopic("");
    setRoleId("");
    setDifficultyLevel("JUNIOR");
    setCount(5);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!topic.trim()) {
      setAlert({ title: "Error", message: "Describe what the questions should cover.", icon: "error" });
      return;
    }

    setSubmitting(true);
    const res = await generateStaffQuestionBankQuestions({
      question_type: type,
      topic: topic.trim(),
      difficulty_level: difficultyLevel,
      count,
      ...(roleId ? { role_id: roleId } : {}),
    });
    setSubmitting(false);

    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    setAlert({
      title: "Success",
      message: `${res.data.length} question${res.data.length === 1 ? "" : "s"} generated and added to the bank.`,
      icon: "success",
    });
    reset();
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button color="primary" className="text-white gap-1.5" onClick={() => setOpen(true)}>
        <LuSparkles className="w-4 h-4" />
        Generate with AI
      </Button>

      <SlidePanel
        id="generate-questions-panel"
        open={open}
        onClose={() => setOpen(false)}
        title="Generate Questions with AI"
        className="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-xs text-secondary-black">
            Describe a role, tech stack, or topic and the AI will generate questions straight into the
            question bank. Only multiple-choice and coding questions can be AI-generated for now --
            open-ended questions need to be added manually or via CSV.
          </p>

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

          <div>
            <label className="label-text text-black font-medium font-onest mb-1 block">
              {type === "MCQ" ? "Topic / job description" : "Programming language(s) / topic"}
            </label>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="textarea textarea-bordered w-full"
              rows={3}
              placeholder={
                type === "MCQ"
                  ? "e.g. Senior React Developer -- hooks, state management, performance"
                  : "e.g. Python, focusing on data structures and algorithms"
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-text text-black font-medium font-onest mb-1 block">Role (optional)</label>
              <select value={roleId} onChange={e => setRoleId(e.target.value)} className="select select-bordered w-full">
                <option value="">None</option>
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
            <div>
              <label className="label-text text-black font-medium font-onest mb-1 block">Count</label>
              <input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={e => setCount(Number(e.target.value))}
                className="input input-bordered w-full"
              />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primary text-white w-full">
            {submitting ? "Generating..." : "Generate"}
          </button>
        </form>
      </SlidePanel>
    </>
  );
};

export default GenerateQuestionsModal;
