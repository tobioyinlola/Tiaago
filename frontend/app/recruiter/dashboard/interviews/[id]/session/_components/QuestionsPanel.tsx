"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";

import { InterviewCompetency, PreparationQuestion } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import { questionTypeStyles } from "../../../interviews.constants";

const QuestionsPanel = ({
  questions,
  competencies,
  onChange,
  onSetActive,
  onUseFollowup,
}: {
  questions: PreparationQuestion[];
  competencies: InterviewCompetency[];
  onChange: (questions: PreparationQuestion[]) => void;
  onSetActive: (question: PreparationQuestion | null) => void;
  onUseFollowup: (text: string) => void;
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingText, setAddingText] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const askedCount = questions.filter(q => q.was_asked).length;

  const toggleAsked = (question: PreparationQuestion) => {
    const nowAsked = !question.was_asked;
    const next = questions.map(q =>
      q.id === question.id
        ? { ...q, was_asked: nowAsked, timestamp: nowAsked ? new Date().toISOString() : null }
        : q
    );
    onChange(next);
    if (nowAsked) onSetActive({ ...question, was_asked: true });
  };

  const toggleExpand = (question: PreparationQuestion) => {
    const next = expandedId === question.id ? null : question.id;
    setExpandedId(next);
    if (next) onSetActive(question);
  };

  const addAdhocQuestion = () => {
    if (!addingText.trim()) return;
    const newQuestion: PreparationQuestion = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `q-adhoc-${questions.length}`,
      number: questions.length + 1,
      text: addingText.trim(),
      type: "BEHAVIOURAL",
      competency_id: null,
      intent: "",
      good_answer_indicators: [],
      followup_prompts: [],
      was_asked: false,
      timestamp: null,
    };
    onChange([...questions, newQuestion]);
    setAddingText("");
    setShowAdd(false);
  };

  return (
    <div className='flex flex-col h-full'>
      <div className='flex items-center justify-between px-4 py-3 border-b border-[#EAECF0] shrink-0'>
        <p className='text-sm font-semibold text-primaryBlack'>Interview Guide</p>
        <span className='text-xs text-secondary-black'>
          {askedCount} of {questions.length} asked
        </span>
      </div>

      <div className='flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2'>
        {questions.map(q => {
          const styles = questionTypeStyles[q.type];
          const competencyName = competencies?.find(c => c.id === q.competency_id)?.name;
          const expanded = expandedId === q.id;
          return (
            <div key={q.id} className={cn("border border-l-4 rounded-lg", styles.border, "border-[#EAECF0]")}>
              <div className='flex items-start gap-2.5 p-2.5'>
                <button
                  type='button'
                  onClick={() => toggleAsked(q)}
                  aria-label={q.was_asked ? "Mark as not asked" : "Mark as asked"}
                  className={cn(
                    "w-5 h-5 rounded border shrink-0 mt-0.5 flex items-center justify-center transition-colors",
                    q.was_asked ? "bg-success border-success" : "bg-white border-[#D0D5DD]"
                  )}
                >
                  {q.was_asked && <Check className='w-3 h-3 text-white' strokeWidth={3} />}
                </button>

                <div className='min-w-0 flex-1 cursor-pointer' onClick={() => toggleExpand(q)}>
                  <p className={cn("text-sm text-primaryBlack leading-[1.5]", !expanded && "line-clamp-2")}>
                    {q.text}
                  </p>
                </div>

                <ChevronDown
                  onClick={() => toggleExpand(q)}
                  className={cn(
                    "w-3.5 h-3.5 text-secondary-black shrink-0 mt-1 cursor-pointer transition-transform",
                    expanded && "rotate-180"
                  )}
                />
              </div>

              {expanded && (
                <div className='px-2.5 pb-3 pl-10 flex flex-col gap-2'>
                  {!!q.followup_prompts?.length && (
                    <div className='bg-[#EFF6FF] rounded-lg p-2.5 flex flex-col gap-1.5'>
                      {q.followup_prompts.map((prompt, i) => (
                        <button
                          key={i}
                          type='button'
                          onClick={() => onUseFollowup(`→ Follow-up: ${prompt}`)}
                          className='text-left text-xs text-primaryBlack bg-white rounded-md px-2 py-1.5 hover:bg-primary/5'
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                  {competencyName && (
                    <span className='text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full w-fit'>
                      {competencyName}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className='px-4 py-3 border-t border-[#EAECF0] shrink-0'>
        {showAdd ? (
          <div className='flex items-center gap-2'>
            <input
              autoFocus
              value={addingText}
              onChange={e => setAddingText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addAdhocQuestion()}
              placeholder='Ad-hoc question...'
              className='input input-bordered input-sm flex-1'
            />
            <button type='button' onClick={addAdhocQuestion} className='btn btn-primary btn-sm text-white rounded-lg'>
              Add
            </button>
          </div>
        ) : (
          <button
            type='button'
            onClick={() => setShowAdd(true)}
            className='flex items-center gap-1.5 text-sm font-medium text-primary'
          >
            <Plus className='w-4 h-4' />
            Add question
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionsPanel;
