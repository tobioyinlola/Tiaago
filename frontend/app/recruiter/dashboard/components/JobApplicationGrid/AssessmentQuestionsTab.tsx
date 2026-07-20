"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { cn } from "@/app/common/utils";
import { SubmissionAnswers } from "@/app/common/types";

const AssessmentQuestionsTab = ({ submissionId }: { submissionId: string | number }) => {
  const [data, setData] = useState<SubmissionAnswers | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await clientKyInstance
          .get(`skill-assessments/submissions/${submissionId}/answers/`)
          .json<SubmissionAnswers>();
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center gap-3 py-16'>
        <Loader2 className='h-6 w-6 animate-spin text-primary' />
        <p className='text-sm text-secondary-black'>Loading assessment questions...</p>
      </div>
    );
  }

  if (notFound || !data || data.sections.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-16 text-center'>
        <p className='text-sm text-secondary-black'>
          No assessment questions were recorded for this attempt.
        </p>
      </div>
    );
  }

  return (
    <div className='p-6 flex flex-col gap-4'>
      {data.sections.map(section => (
        <div
          key={section.id}
          className='collapse collapse-arrow rounded-lg border border-[#EAECF0]'
        >
          <input type='checkbox' defaultChecked />
          <div className='collapse-title flex items-center gap-2 min-h-0 py-4 px-4'>
            <span className='inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1'>
              {section.name}
            </span>
            <span className='text-xs text-secondary-black'>
              {section.type === "MCQ"
                ? `${section.questions?.length ?? 0} questions`
                : `${section.coding_tasks?.length ?? 0} tasks`}
            </span>
          </div>

          <div className='collapse-content flex flex-col gap-5 px-4'>
            {section.type === "MCQ" &&
              section.questions?.map((question, qIdx) => (
                <div
                  key={question.id}
                  className='pb-5 border-b border-[#EAECF0] last:border-b-0 last:pb-0'
                >
                  <p className='text-sm font-medium text-primary-black mb-3'>
                    {qIdx + 1}. {question.question}
                  </p>
                  <div className='grid sm:grid-cols-2 gap-2'>
                    {question.options.map(option => {
                      const isCorrectOption = option.index === question.correct_option_index;
                      const isSelected = option.index === question.selected_option_index;
                      return (
                        <div
                          key={option.index}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
                            isCorrectOption
                              ? "border-success bg-success/5"
                              : isSelected
                                ? "border-error bg-error/5"
                                : "border-[#EAECF0]"
                          )}
                        >
                          <span>{option.value}</span>
                          {isSelected && (
                            <span
                              className={cn(
                                "text-xs font-semibold shrink-0",
                                question.is_correct ? "text-success" : "text-error"
                              )}
                            >
                              Candidate&apos;s answer
                            </span>
                          )}
                          {!isSelected && isCorrectOption && (
                            <span className='text-xs font-semibold text-success shrink-0'>
                              Correct answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

            {section.type === "CODING_TASK" &&
              section.coding_tasks?.map((task, tIdx) => (
                <div
                  key={task.id}
                  className='pb-5 border-b border-[#EAECF0] last:border-b-0 last:pb-0'
                >
                  <p className='text-sm font-medium text-primary-black mb-1'>
                    {tIdx + 1}. {task.title}
                  </p>
                  <p className='text-sm text-secondary-black mb-3 whitespace-pre-wrap'>
                    {task.description}
                  </p>
                  <div className='rounded-lg border border-[#EAECF0] bg-[#F8FAFC] p-3'>
                    <p className='text-xs font-semibold text-secondary-black uppercase tracking-wide mb-2'>
                      Candidate&apos;s answer
                    </p>
                    <pre className='text-sm whitespace-pre-wrap font-mono text-primary-black'>
                      {task.candidate_answer || "No answer submitted"}
                    </pre>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AssessmentQuestionsTab;
