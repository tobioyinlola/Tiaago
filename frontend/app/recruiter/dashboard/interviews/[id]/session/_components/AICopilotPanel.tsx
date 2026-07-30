"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, MessageCircle, Sparkles } from "lucide-react";

import {
  CompetencyEvidence,
  CompetencyScore,
  CopilotSuggestionEvent,
  ID,
  InterviewCompetency,
  PreparationQuestion,
  TranscriptSegment,
} from "@/app/common/types";
import { cn } from "@/app/common/utils";
import { getInterviewScorecard } from "@/app/common/services/interview-workspace";
import TranscriptTab from "./TranscriptTab";
import SuggestionsTab from "./SuggestionsTab";

type Tab = "suggestions" | "transcript" | "insights";

const AICopilotPanel = ({
  interviewId,
  activeQuestion,
  questions,
  competencies,
  durationMinutes,
  startedAt,
  onUseFollowup,
  segments,
  suggestions,
  evidenceByCompetency,
}: {
  interviewId: ID;
  activeQuestion: PreparationQuestion | null;
  questions: PreparationQuestion[];
  competencies: InterviewCompetency[];
  durationMinutes: number;
  startedAt: number;
  onUseFollowup: (text: string) => void;
  segments: TranscriptSegment[];
  suggestions: CopilotSuggestionEvent[];
  evidenceByCompetency: Record<string, CompetencyEvidence[]>;
}) => {
  const [tab, setTab] = useState<Tab>("suggestions");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [elapsedMinutes, setElapsedMinutes] = useState(() =>
    Math.floor((Date.now() - startedAt) / 60000)
  );
  const [scoredIds, setScoredIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMinutes(Math.floor((Date.now() - startedAt) / 60000));
    }, 15_000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const askedQuestions = questions.filter(q => q.was_asked);
  const coveredCompetencyIds = new Set(
    askedQuestions.map(q => q.competency_id).filter(Boolean) as string[]
  );
  const unaskedCount = questions.length - askedQuestions.length;
  const ratio = durationMinutes > 0 ? elapsedMinutes / durationMinutes : 0;
  const remainingMinutes = Math.max(0, durationMinutes - elapsedMinutes);

  const activeFollowups = (activeQuestion?.followup_prompts || []).filter(
    (_, i) => !dismissed.has(`${activeQuestion?.id}-${i}`)
  );

  return (
    <div className='flex flex-col h-full'>
      <div className='flex items-center justify-between gap-2 px-4 py-3 border-b border-[#EAECF0] shrink-0'>
        <div className='flex items-center gap-2'>
          <Sparkles className='w-4 h-4 text-primary' />
          <p className='text-sm font-semibold text-primaryBlack'>AI Copilot</p>
        </div>
        {tab === "transcript" && !!segments.length && (
          <span className='flex items-center gap-1 text-[10px] text-secondary-black'>
            <span className='w-1.5 h-1.5 rounded-full bg-success animate-pulse' />
            Live
          </span>
        )}
      </div>

      <div className='flex border-b border-[#EAECF0] shrink-0'>
        {(["suggestions", "transcript", "insights"] as Tab[]).map(t => (
          <button
            key={t}
            type='button'
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 text-xs font-medium py-2.5 capitalize border-b-2 -mb-px",
              tab === t ? "border-primary text-primary" : "border-transparent text-secondary-black"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className={cn("flex-1 overflow-y-auto", tab === "transcript" ? "" : "p-4")}>
        {tab === "suggestions" && (
          <div className='flex flex-col gap-4 p-4'>
            {(ratio >= 0.75 || unaskedCount > 0) && (
              <div className='bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800'>
                {ratio >= 0.75 && (
                  <p>
                    You have {remainingMinutes} minute{remainingMinutes === 1 ? "" : "s"} remaining.
                  </p>
                )}
                {unaskedCount > 0 && (
                  <p>{unaskedCount} question{unaskedCount === 1 ? "" : "s"} not yet asked.</p>
                )}
              </div>
            )}

            <SuggestionsTab suggestions={suggestions} onUseFollowup={onUseFollowup} />

            {activeQuestion && !!activeFollowups.length && (
              <div>
                <p className='text-xs font-medium text-secondary-black uppercase tracking-wide mb-2'>
                  Suggested follow-ups for current question
                </p>
                <div className='flex flex-col gap-2'>
                  {activeFollowups.map((prompt, i) => {
                    const key = `${activeQuestion.id}-${i}`;
                    return (
                      <div key={key} className='border border-[#EAECF0] rounded-lg p-3 flex flex-col gap-2'>
                        <div className='flex items-start gap-2'>
                          <MessageCircle className='w-3.5 h-3.5 text-primary shrink-0 mt-0.5' />
                          <p className='text-sm text-primaryBlack'>{prompt}</p>
                        </div>
                        <div className='flex items-center gap-2 justify-end'>
                          <button
                            type='button'
                            onClick={() => setDismissed(prev => new Set(prev).add(key))}
                            className='text-xs text-secondary-black'
                          >
                            Dismiss
                          </button>
                          <button
                            type='button'
                            onClick={() => onUseFollowup(`→ Follow-up: ${prompt}`)}
                            className='btn btn-xs btn-primary text-white rounded-md'
                          >
                            Use
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!!competencies?.length && (
              <div>
                <p className='text-xs font-medium text-secondary-black uppercase tracking-wide mb-2'>
                  Competency coverage
                </p>
                <div className='flex flex-col gap-1.5'>
                  {competencies.map(c => (
                    <div key={c.id} className='flex items-center gap-2'>
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          coveredCompetencyIds.has(c.id) ? "bg-success" : "bg-amber-400"
                        )}
                      />
                      <span className='text-xs text-primaryBlack'>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "transcript" && <TranscriptTab segments={segments} />}

        {tab === "insights" && (
          <InsightsTab
            interviewId={interviewId}
            competencies={competencies}
            coveredIds={coveredCompetencyIds}
            scoredIds={scoredIds}
            setScoredIds={setScoredIds}
            evidenceByCompetency={evidenceByCompetency}
            suggestions={suggestions}
          />
        )}
      </div>
    </div>
  );
};

const InsightsTab = ({
  interviewId,
  competencies,
  coveredIds,
  scoredIds,
  setScoredIds,
  evidenceByCompetency,
  suggestions,
}: {
  interviewId: ID;
  competencies: InterviewCompetency[];
  coveredIds: Set<string>;
  scoredIds: Set<string>;
  setScoredIds: (ids: Set<string>) => void;
  evidenceByCompetency: Record<string, CompetencyEvidence[]>;
  suggestions: CopilotSuggestionEvent[];
}) => {
  useEffect(() => {
    getInterviewScorecard(interviewId).then(res => {
      if (res.success) {
        setScoredIds(
          new Set(
            res.data.competencies
              .filter((c: CompetencyScore) => c.scored_at)
              .map((c: CompetencyScore) => c.competency_id)
          )
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  const resumeFlags = suggestions.filter(s => s.event_type === "RESUME_CONTRADICTION");

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <p className='text-xs font-medium text-secondary-black uppercase tracking-wide mb-2'>
          Competency coverage
        </p>
        {competencies?.length ? (
          <div className='flex flex-col gap-2'>
            {competencies.map(c => {
              const scored = scoredIds.has(c.id);
              const covered = coveredIds.has(c.id);
              const evidence = evidenceByCompetency[c.id];
              const color = scored ? "bg-success" : covered ? "bg-amber-400" : "bg-gray-300";
              const label = scored ? "Scored" : covered ? "Asked, not scored" : "Not asked yet";
              return (
                <div key={c.id} className='flex flex-col gap-1'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0 transition-colors duration-500", color)} />
                      <span className='text-sm text-primaryBlack'>{c.name}</span>
                      {!!evidence?.length && (
                        <span
                          title={`${evidence.length} AI evidence quote${evidence.length === 1 ? "" : "s"} captured`}
                          className='w-1.5 h-1.5 rounded-full bg-primary'
                        />
                      )}
                    </div>
                    <span className='text-xs text-secondary-black'>{label}</span>
                  </div>
                  {!!evidence?.length && (
                    <p className='text-[11px] text-secondary-black pl-4.5 italic truncate'>
                      &ldquo;{evidence[evidence.length - 1].quote}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className='text-sm text-secondary-black'>No competencies for this interview yet.</p>
        )}
      </div>

      <div>
        <p className='text-xs font-medium text-secondary-black uppercase tracking-wide mb-2'>
          Resume flags
        </p>
        {resumeFlags.length ? (
          <div className='flex flex-col gap-2'>
            {resumeFlags.map(flag => (
              <div key={flag.id} className='flex items-start gap-2 border border-red-200 bg-red-50 rounded-lg p-2.5'>
                <AlertOctagon className='w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5' />
                <p className='text-xs text-red-800'>{flag.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-xs text-secondary-black'>No resume concerns flagged so far.</p>
        )}
      </div>
    </div>
  );
};

export default AICopilotPanel;
