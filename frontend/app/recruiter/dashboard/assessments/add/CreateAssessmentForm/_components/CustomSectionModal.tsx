"use client";

import { useState } from "react";
import { LuTrash2, LuPlus } from "react-icons/lu";

import { ID } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import Modal from "@/app/common/components/Modal";
import Button from "@/app/common/components/DaisyButton";
import { useAlert } from "@/app/common/store/useAlert";
import { addSectionsToAssessment } from "@/app/common/services/assessment";

type SectionType = "MCQ" | "CODING_TASK" | "OPEN_ENDED";

type MCQDraft = { question: string; options: string[]; correct_option_index: number };
type CodingDraft = { title: string; description: string; difficulty_level: string; constraints: string };
type OpenEndedDraft = { question: string; grading_guidance: string };

const blankMCQ = (): MCQDraft => ({ question: "", options: ["", "", "", ""], correct_option_index: 1 });
const blankCoding = (): CodingDraft => ({ title: "", description: "", difficulty_level: "JUNIOR", constraints: "" });
const blankOpenEnded = (): OpenEndedDraft => ({ question: "", grading_guidance: "" });

const sectionTypeLabels: Record<SectionType, string> = {
  MCQ: "Multiple Choice",
  CODING_TASK: "Coding Task",
  OPEN_ENDED: "Open-Ended",
};

export const customSectionModalId = "custom-section-modal";

const CustomSectionModal = ({
  assessmentId,
  modalRef,
  onAdded,
}: {
  assessmentId: ID;
  modalRef: React.RefObject<HTMLDialogElement>;
  onAdded: () => void;
}) => {
  const setAlert = useAlert(s => s.setAlert);
  const [type, setType] = useState<SectionType>("MCQ");
  const [name, setName] = useState("");
  const [mcqs, setMcqs] = useState<MCQDraft[]>([blankMCQ()]);
  const [codingTasks, setCodingTasks] = useState<CodingDraft[]>([blankCoding()]);
  const [openEnded, setOpenEnded] = useState<OpenEndedDraft[]>([blankOpenEnded()]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setType("MCQ");
    setName("");
    setMcqs([blankMCQ()]);
    setCodingTasks([blankCoding()]);
    setOpenEnded([blankOpenEnded()]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setAlert({ title: "Error", message: "Give this section a name.", icon: "error" });
      return;
    }

    let payload;
    if (type === "MCQ") {
      const cleaned = mcqs.filter(m => m.question.trim() && m.options.every(o => o.trim()));
      if (!cleaned.length) {
        setAlert({ title: "Error", message: "Add at least one complete MCQ question.", icon: "error" });
        return;
      }
      payload = {
        name,
        type,
        mcq_questions: cleaned.map(m => ({
          question: m.question,
          options: m.options.map((value, i) => ({ value, index: i + 1 })),
          correct_option_index: m.correct_option_index,
        })),
      };
    } else if (type === "CODING_TASK") {
      const cleaned = codingTasks.filter(t => t.title.trim() && t.description.trim());
      if (!cleaned.length) {
        setAlert({ title: "Error", message: "Add at least one complete coding task.", icon: "error" });
        return;
      }
      payload = {
        name,
        type,
        coding_tasks: cleaned.map(t => ({
          title: t.title,
          description: t.description,
          difficulty_level: t.difficulty_level,
          constraints: t.constraints || undefined,
        })),
      };
    } else {
      const cleaned = openEnded.filter(q => q.question.trim());
      if (!cleaned.length) {
        setAlert({ title: "Error", message: "Add at least one open-ended question.", icon: "error" });
        return;
      }
      payload = {
        name,
        type,
        open_ended_questions: cleaned.map(q => ({
          question: q.question,
          grading_guidance: q.grading_guidance || undefined,
        })),
      };
    }

    setSubmitting(true);
    const res = await addSectionsToAssessment(assessmentId, [payload]);
    setSubmitting(false);
    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    reset();
    modalRef.current?.close();
    onAdded();
  };

  return (
    <Modal id={customSectionModalId} modalRef={modalRef} scrollAreaClassName="max-h-[75vh]">
      <h2 className="text-xl font-semibold text-primaryBlack mb-1">Create Custom Test</h2>
      <p className="text-sm text-[#9DA3A8] mb-5">
        Build a section by hand -- pick a type, add your questions, and save.
      </p>

      <div className="flex gap-2 mb-5">
        {(Object.keys(sectionTypeLabels) as SectionType[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "flex-1 border rounded-lg px-3 py-2 text-sm font-medium border-[#EAECF0]",
              type === t ? "bg-primary text-white border-primary" : "text-[#344054]"
            )}
          >
            {sectionTypeLabels[t]}
          </button>
        ))}
      </div>

      <label className="block text-sm font-medium text-[#344054] mb-1">Section name</label>
      <input
        className="input input-bordered w-full mb-5"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={`e.g. ${sectionTypeLabels[type]} Round`}
      />

      {type === "MCQ" && (
        <div className="space-y-6">
          {mcqs.map((mcq, mi) => (
            <div key={mi} className="border border-[#EAECF0] rounded-lg p-4 relative">
              {mcqs.length > 1 && (
                <button
                  type="button"
                  className="absolute top-3 right-3 text-error"
                  onClick={() => setMcqs(mcqs.filter((_, i) => i !== mi))}
                >
                  <LuTrash2 />
                </button>
              )}
              <label className="block text-xs font-medium text-[#6C757D] mb-1">
                Question {mi + 1}
              </label>
              <textarea
                className="textarea textarea-bordered w-full mb-3"
                value={mcq.question}
                onChange={e => {
                  const next = [...mcqs];
                  next[mi] = { ...mcq, question: e.target.value };
                  setMcqs(next);
                }}
                placeholder="Question text"
              />
              <div className="space-y-2">
                {mcq.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio radio-primary radio-sm"
                      checked={mcq.correct_option_index === oi + 1}
                      onChange={() => {
                        const next = [...mcqs];
                        next[mi] = { ...mcq, correct_option_index: oi + 1 };
                        setMcqs(next);
                      }}
                    />
                    <input
                      className="input input-bordered input-sm w-full"
                      value={opt}
                      onChange={e => {
                        const next = [...mcqs];
                        const options = [...mcq.options];
                        options[oi] = e.target.value;
                        next[mi] = { ...mcq, options };
                        setMcqs(next);
                      }}
                      placeholder={`Option ${oi + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            className="flex items-center gap-1 text-primary text-sm font-medium"
            onClick={() => setMcqs([...mcqs, blankMCQ()])}
          >
            <LuPlus /> Add another question
          </button>
        </div>
      )}

      {type === "CODING_TASK" && (
        <div className="space-y-6">
          {codingTasks.map((task, ti) => (
            <div key={ti} className="border border-[#EAECF0] rounded-lg p-4 relative space-y-3">
              {codingTasks.length > 1 && (
                <button
                  type="button"
                  className="absolute top-3 right-3 text-error"
                  onClick={() => setCodingTasks(codingTasks.filter((_, i) => i !== ti))}
                >
                  <LuTrash2 />
                </button>
              )}
              <input
                className="input input-bordered w-full"
                value={task.title}
                onChange={e => {
                  const next = [...codingTasks];
                  next[ti] = { ...task, title: e.target.value };
                  setCodingTasks(next);
                }}
                placeholder="Task title"
              />
              <textarea
                className="textarea textarea-bordered w-full"
                value={task.description}
                onChange={e => {
                  const next = [...codingTasks];
                  next[ti] = { ...task, description: e.target.value };
                  setCodingTasks(next);
                }}
                placeholder="Problem statement"
              />
              <select
                className="select select-bordered w-full"
                value={task.difficulty_level}
                onChange={e => {
                  const next = [...codingTasks];
                  next[ti] = { ...task, difficulty_level: e.target.value };
                  setCodingTasks(next);
                }}
              >
                <option value="JUNIOR">Junior</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="SENIOR">Senior</option>
              </select>
              <textarea
                className="textarea textarea-bordered w-full"
                value={task.constraints}
                onChange={e => {
                  const next = [...codingTasks];
                  next[ti] = { ...task, constraints: e.target.value };
                  setCodingTasks(next);
                }}
                placeholder="Constraints / function signature (optional)"
              />
            </div>
          ))}
          <button
            type="button"
            className="flex items-center gap-1 text-primary text-sm font-medium"
            onClick={() => setCodingTasks([...codingTasks, blankCoding()])}
          >
            <LuPlus /> Add another task
          </button>
        </div>
      )}

      {type === "OPEN_ENDED" && (
        <div className="space-y-6">
          {openEnded.map((q, qi) => (
            <div key={qi} className="border border-[#EAECF0] rounded-lg p-4 relative space-y-3">
              {openEnded.length > 1 && (
                <button
                  type="button"
                  className="absolute top-3 right-3 text-error"
                  onClick={() => setOpenEnded(openEnded.filter((_, i) => i !== qi))}
                >
                  <LuTrash2 />
                </button>
              )}
              <textarea
                className="textarea textarea-bordered w-full"
                value={q.question}
                onChange={e => {
                  const next = [...openEnded];
                  next[qi] = { ...q, question: e.target.value };
                  setOpenEnded(next);
                }}
                placeholder="Question the candidate will answer"
              />
              <textarea
                className="textarea textarea-bordered w-full"
                value={q.grading_guidance}
                onChange={e => {
                  const next = [...openEnded];
                  next[qi] = { ...q, grading_guidance: e.target.value };
                  setOpenEnded(next);
                }}
                placeholder="Grading guidance for the recruiter/AI (optional)"
              />
            </div>
          ))}
          <button
            type="button"
            className="flex items-center gap-1 text-primary text-sm font-medium"
            onClick={() => setOpenEnded([...openEnded, blankOpenEnded()])}
          >
            <LuPlus /> Add another question
          </button>
        </div>
      )}

      <div className="modal-action">
        <Button type="button" color="primary" className="text-white flex-1" loading={submitting} onClick={handleSubmit}>
          Save section
        </Button>
      </div>
    </Modal>
  );
};

export default CustomSectionModal;
