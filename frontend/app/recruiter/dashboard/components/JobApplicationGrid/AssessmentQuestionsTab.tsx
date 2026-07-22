"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { cn } from "@/app/common/utils";
import { SubmissionAnswers, SubmissionAnswerOpenEndedQuestion } from "@/app/common/types";
import Button from "@/app/common/components/DaisyButton";
import { useAlert } from "@/app/common/store/useAlert";
import { gradeOpenEndedAnswers } from "@/app/common/services/assessment";

const OpenEndedQuestionGrader = ({
  submissionId,
  question,
  qIdx,
  onGraded,
}: {
  submissionId: string | number;
  question: SubmissionAnswerOpenEndedQuestion;
  qIdx: number;
  onGraded: () => void;
}) => {
  const setAlert = useAlert(s => s.setAlert);
  const [score, setScore] = useState(
    question.score ?? question.ai_suggested_score ?? 0
  );
  const [feedback, setFeedback] = useState(
    question.feedback || question.ai_suggested_feedback || ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!question.answer_id) return;
    setSaving(true);
    const res = await gradeOpenEndedAnswers(submissionId, [
      { answer_id: question.answer_id, score: Number(score), feedback },
    ]);
    setSaving(false);
    if (!res.success) {
      setAlert({ title: "Error", message: res.error, icon: "error" });
      return;
    }
    setAlert({
      title: "Saved",
      message: res.data.finalized
        ? "Grade saved -- every open-ended answer is graded, so the submission has been finalized."
        : "Grade saved.",
      icon: "success",
    });
    onGraded();
  };

  return (
    <div className="pb-5 border-b border-[#EAECF0] last:border-b-0 last:pb-0">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-primary-black">
          {qIdx + 1}. {question.question}
        </p>
        {question.is_graded && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-success shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5" /> Graded
          </span>
        )}
      </div>
      {question.grading_guidance && (
        <p className="text-xs text-secondary-black italic mb-3">
          Guidance: {question.grading_guidance}
        </p>
      )}

      <div className="rounded-lg border border-[#EAECF0] bg-[#F8FAFC] p-3 mb-3">
        <p className="text-xs font-semibold text-secondary-black uppercase tracking-wide mb-2">
          Candidate&apos;s answer
        </p>
        <p className="text-sm whitespace-pre-wrap text-primary-black">
          {question.answer_text || "No answer submitted"}
        </p>
      </div>

      {question.ai_suggested_score !== null && (
        <p className="text-xs text-secondary-black mb-3">
          AI suggestion: {question.ai_suggested_score}/{question.max_score} --{" "}
          {question.ai_suggested_feedback}
        </p>
      )}

      <div className="flex items-end gap-3">
        <div className="w-28">
          <label className="text-xs text-secondary-black block mb-1">
            Score (/{question.max_score})
          </label>
          <input
            type="number"
            min={0}
            max={question.max_score}
            className="input input-bordered input-sm w-full"
            value={score}
            onChange={e => setScore(Number(e.target.value))}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-secondary-black block mb-1">Feedback</label>
          <textarea
            className="textarea textarea-bordered textarea-sm w-full"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
          />
        </div>
        <Button
          type="button"
          color="primary"
          size="sm"
          className="text-white shrink-0"
          loading={saving}
          onClick={handleSave}
        >
          Save grade
        </Button>
      </div>
    </div>
  );
};

const AssessmentQuestionsTab = ({ submissionId }: { submissionId: string | number }) => {
  const [data, setData] = useState<SubmissionAnswers | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
  }, [submissionId, refreshKey]);

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
                : section.type === "CODING_TASK"
                ? `${section.coding_tasks?.length ?? 0} tasks`
                : `${section.open_ended_questions?.length ?? 0} questions`}
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

            {section.type === "OPEN_ENDED" &&
              section.open_ended_questions?.map((question, qIdx) => (
                <OpenEndedQuestionGrader
                  key={question.id}
                  submissionId={submissionId}
                  question={question}
                  qIdx={qIdx}
                  onGraded={() => setRefreshKey(k => k + 1)}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AssessmentQuestionsTab;
