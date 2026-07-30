"use client";

import { useState } from "react";

import { InterviewCompetency, QuestionType } from "@/app/common/types";
import { questionTypeLabel } from "../../../interviews.constants";

const TYPES = Object.keys(questionTypeLabel) as QuestionType[];

const AddQuestionForm = ({
  competencies,
  onSave,
  onCancel,
}: {
  competencies: InterviewCompetency[];
  onSave: (data: { text: string; type: QuestionType; competency_id: string | null }) => void;
  onCancel: () => void;
}) => {
  const [text, setText] = useState("");
  const [type, setType] = useState<QuestionType>("BEHAVIOURAL");
  const [competencyId, setCompetencyId] = useState<string>("");

  const handleSave = () => {
    if (!text.trim()) return;
    onSave({ text: text.trim(), type, competency_id: competencyId || null });
  };

  return (
    <div className='border border-primary/30 bg-primary/5 rounded-xl p-4 mt-3 flex flex-col gap-3'>
      <textarea
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder='Question text'
        className='textarea textarea-bordered w-full bg-white text-sm'
        rows={2}
      />
      <div className='flex flex-col sm:flex-row gap-3'>
        <select
          value={type}
          onChange={e => setType(e.target.value as QuestionType)}
          className='select select-bordered select-sm bg-white flex-1'
        >
          {TYPES.map(t => (
            <option key={t} value={t}>
              {questionTypeLabel[t]}
            </option>
          ))}
        </select>
        <select
          value={competencyId}
          onChange={e => setCompetencyId(e.target.value)}
          className='select select-bordered select-sm bg-white flex-1'
        >
          <option value=''>No competency</option>
          {competencies?.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className='flex items-center gap-2 justify-end'>
        <button type='button' onClick={onCancel} className='btn btn-ghost btn-sm rounded-lg'>
          Cancel
        </button>
        <button
          type='button'
          onClick={handleSave}
          disabled={!text.trim()}
          className='btn btn-primary btn-sm text-white rounded-lg'
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default AddQuestionForm;
