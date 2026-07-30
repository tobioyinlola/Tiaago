"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, ChevronDown as ExpandIcon, Pencil, Plus, Trash2 } from "lucide-react";

import { InterviewCompetency, PreparationQuestion } from "@/app/common/types";
import { cn } from "@/app/common/utils";
import { questionTypeLabel, questionTypeStyles } from "../../../interviews.constants";
import AddQuestionForm from "./AddQuestionForm";

const QuestionCard = ({
  question,
  index,
  total,
  competencies,
  expanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onMove,
}: {
  question: PreparationQuestion;
  index: number;
  total: number;
  competencies: InterviewCompetency[];
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (patch: Partial<PreparationQuestion>, debounce?: boolean) => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
}) => {
  const [editingText, setEditingText] = useState(false);
  const [draftText, setDraftText] = useState(question.text);
  const styles = questionTypeStyles[question.type];
  const competencyName = competencies?.find(c => c.id === question.competency_id)?.name;

  const commitText = () => {
    setEditingText(false);
    if (draftText.trim() && draftText !== question.text) {
      onUpdate({ text: draftText.trim() }, true);
    } else {
      setDraftText(question.text);
    }
  };

  const copyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className={cn("border border-l-4 border-[#EAECF0] rounded-xl bg-white", styles.border)}>
      <div className='flex items-start gap-3 p-3'>
        <span
          className={cn(
            "text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
            styles.badge
          )}
        >
          {question.number}
        </span>

        <div className='min-w-0 flex-1 cursor-pointer' onClick={onToggleExpand}>
          <p className={cn("text-sm text-primaryBlack", !expanded && "line-clamp-1")}>
            {question.text}
          </p>
          <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full inline-block mt-1", styles.badge)}>
            {questionTypeLabel[question.type]}
          </span>
        </div>

        <div className='flex items-center gap-1 shrink-0'>
          <button
            type='button'
            onClick={() => onMove("up")}
            disabled={index === 0}
            className='p-1 text-secondary-black hover:text-primary disabled:opacity-30'
            aria-label='Move up'
          >
            <ChevronUp className='w-3.5 h-3.5' />
          </button>
          <button
            type='button'
            onClick={() => onMove("down")}
            disabled={index === total - 1}
            className='p-1 text-secondary-black hover:text-primary disabled:opacity-30'
            aria-label='Move down'
          >
            <ChevronDown className='w-3.5 h-3.5' />
          </button>
          <button
            type='button'
            onClick={() => {
              setEditingText(true);
              onToggleExpand();
            }}
            className='p-1 text-secondary-black hover:text-primary'
            aria-label='Edit question'
          >
            <Pencil className='w-3.5 h-3.5' />
          </button>
          <button
            type='button'
            onClick={onDelete}
            className='p-1 text-secondary-black hover:text-destructive'
            aria-label='Delete question'
          >
            <Trash2 className='w-3.5 h-3.5' />
          </button>
          <ExpandIcon
            className={cn(
              "w-3.5 h-3.5 text-secondary-black transition-transform cursor-pointer",
              expanded && "rotate-180"
            )}
            onClick={onToggleExpand}
          />
        </div>
      </div>

      {expanded && (
        <div className='px-3 pb-4 pl-12 flex flex-col gap-3'>
          {editingText ? (
            <textarea
              autoFocus
              value={draftText}
              onChange={e => setDraftText(e.target.value)}
              onBlur={commitText}
              className='textarea textarea-bordered w-full text-sm'
              rows={2}
            />
          ) : (
            <p className='text-[15px] text-primaryBlack leading-relaxed'>{question.text}</p>
          )}

          {question.intent && (
            <p className='text-xs text-secondary-black'>
              This question assesses: <span className='text-primaryBlack'>{question.intent}</span>
            </p>
          )}

          {!!question.good_answer_indicators?.length && (
            <div className='bg-[#F8FAFC] rounded-lg p-3'>
              <p className='text-[11px] font-medium text-secondary-black uppercase tracking-wide mb-1.5'>
                Strong answers will include
              </p>
              <ul className='text-sm text-primaryBlack list-disc list-inside space-y-0.5'>
                {question.good_answer_indicators.map((indicator, i) => (
                  <li key={i}>{indicator}</li>
                ))}
              </ul>
            </div>
          )}

          {!!question.followup_prompts?.length && (
            <div>
              <p className='text-[11px] font-medium text-secondary-black uppercase tracking-wide mb-1.5'>
                Follow-ups if needed
              </p>
              <div className='flex flex-wrap gap-2'>
                {question.followup_prompts.map((prompt, i) => (
                  <button
                    key={i}
                    type='button'
                    onClick={() => copyPrompt(prompt)}
                    title='Click to copy'
                    className='text-xs bg-[#F5F6F7] hover:bg-[#EAECF0] text-secondary-black px-2.5 py-1 rounded-full'
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {competencyName && (
            <span className='text-[11px] font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full w-fit'>
              {competencyName}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const QuestionGuide = ({
  questions,
  competencies,
  onChange,
}: {
  questions: PreparationQuestion[];
  competencies: InterviewCompetency[];
  onChange: (questions: PreparationQuestion[]) => void;
}) => {
  const [items, setItems] = useState(questions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const localIdCounter = useRef(0);

  // Stay in sync if the parent's data changes underneath us (e.g. a
  // successful "Regenerate brief" replaces the whole array) -- adjusting
  // state during render (React's documented pattern for this) rather than
  // in an effect, which would cost an extra render pass.
  const [prevQuestions, setPrevQuestions] = useState(questions);
  if (questions !== prevQuestions) {
    setPrevQuestions(questions);
    setItems(questions);
  }

  const commit = (next: PreparationQuestion[], debounce = false) => {
    setItems(next);
    if (!debounce) {
      clearTimeout(debounceRef.current);
      onChange(next);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(next), 700);
  };

  const updateQuestion = (id: string, patch: Partial<PreparationQuestion>, debounce = false) => {
    commit(
      items.map(q => (q.id === id ? { ...q, ...patch } : q)),
      debounce
    );
  };

  const deleteQuestion = (id: string) => {
    commit(items.filter(q => q.id !== id).map((q, i) => ({ ...q, number: i + 1 })));
  };

  const moveQuestion = (id: string, direction: "up" | "down") => {
    const idx = items.findIndex(q => q.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= items.length) return;
    const next = [...items];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    commit(next.map((q, i) => ({ ...q, number: i + 1 })));
  };

  const addQuestion = (data: { text: string; type: PreparationQuestion["type"]; competency_id: string | null }) => {
    const newQuestion: PreparationQuestion = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `q-local-${(localIdCounter.current += 1)}`,
      number: items.length + 1,
      text: data.text,
      type: data.type,
      competency_id: data.competency_id,
      intent: "",
      good_answer_indicators: [],
      followup_prompts: [],
      was_asked: false,
      timestamp: null,
    };
    commit([...items, newQuestion]);
    setAddingNew(false);
  };

  return (
    <div className='bg-white border border-[#EAECF0] rounded-2lg p-5'>
      <div className='mb-4'>
        <p className='text-sm font-semibold text-primaryBlack'>Interview guide</p>
        <p className='text-xs text-secondary-black mt-0.5'>
          Generated from job requirements and this candidate&apos;s profile. Edit freely.
        </p>
        <p className='text-[11px] text-secondary-black/70 mt-0.5'>All changes auto-save</p>
      </div>

      {!items.length ? (
        <p className='text-sm text-secondary-black py-4'>No questions yet.</p>
      ) : (
        <div className='flex flex-col gap-2.5'>
          {items.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              total={items.length}
              competencies={competencies}
              expanded={expandedId === q.id}
              onToggleExpand={() => setExpandedId(expandedId === q.id ? null : q.id)}
              onUpdate={(patch, debounce) => updateQuestion(q.id, patch, debounce)}
              onDelete={() => deleteQuestion(q.id)}
              onMove={dir => moveQuestion(q.id, dir)}
            />
          ))}
        </div>
      )}

      {addingNew ? (
        <AddQuestionForm
          competencies={competencies}
          onSave={addQuestion}
          onCancel={() => setAddingNew(false)}
        />
      ) : (
        <button
          type='button'
          onClick={() => setAddingNew(true)}
          className='flex items-center gap-1.5 text-sm font-medium text-primary mt-4'
        >
          <Plus className='w-4 h-4' />
          Add question
        </button>
      )}
    </div>
  );
};

export default QuestionGuide;
