"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/app/common/utils";
import type { AIInterviewQuestionDetail } from "@/app/common/services/ai-interviews";

const SIGNAL_BADGE: Record<string, string> = {
  STRONG: "bg-success/15 text-success",
  MODERATE: "bg-badge-blue-bg text-badge-blue-text",
  WEAK: "bg-amber-100 text-amber-700",
  NO_RESPONSE: "bg-destructive/10 text-destructive",
};

const QuestionsTab = ({ questions }: { questions: AIInterviewQuestionDetail[] }) => {
  const [expanded, setExpanded] = useState<Set<string | number>>(new Set());

  const toggle = (id: string | number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (questions.length === 0) {
    return <p className='text-sm text-secondary-black'>No questions recorded for this interview.</p>;
  }

  return (
    <div className='flex flex-col gap-4 max-w-3xl'>
      {questions.map(question => {
        const isOpen = expanded.has(question.id);
        return (
          <div key={question.id} className='rounded-xl border border-[#EAECF0] p-5'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='text-xs font-semibold text-secondary-black uppercase tracking-wide mb-1'>
                  Q{question.number} &middot; {question.type}
                </p>
                <p className='text-primaryBlack font-medium'>{question.text}</p>
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                {question.score !== null && (
                  <span className='text-sm font-bold text-primaryBlack'>{question.score}/10</span>
                )}
                {question.signal_strength && (
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", SIGNAL_BADGE[question.signal_strength])}>
                    {question.signal_strength.replace("_", " ")}
                  </span>
                )}
              </div>
            </div>

            {question.ai_notes && <p className='text-sm text-secondary-black mt-3'>{question.ai_notes}</p>}

            {question.candidate_response && (
              <button
                type='button'
                onClick={() => toggle(question.id)}
                className='flex items-center gap-1 text-xs font-semibold text-primary mt-3'
              >
                {isOpen ? "Hide" : "View"} full response
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
              </button>
            )}
            {isOpen && question.candidate_response && (
              <p className='text-sm text-primaryBlack bg-[#F5F6F7] rounded-lg p-3 mt-2 leading-6'>
                {question.candidate_response}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default QuestionsTab;
