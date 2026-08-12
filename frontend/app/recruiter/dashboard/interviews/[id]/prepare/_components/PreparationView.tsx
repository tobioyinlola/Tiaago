"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ID, InterviewPreparation, PreparationQuestion } from "@/app/common/types";
import {
  getInterviewPreparation,
  regenerateInterviewPreparation,
  updateInterviewPreparationQuestions,
} from "@/app/common/services/interview-preparation";
import PrepHeader from "./PrepHeader";
import CandidateSnapshot from "./CandidateSnapshot";
import CareerTimeline from "./CareerTimeline";
import StrengthsWatchAreas from "./StrengthsWatchAreas";
import AssessmentHighlightsCard from "./AssessmentHighlightsCard";
import QuestionGuide from "./QuestionGuide";
import GenerationBanner from "./GenerationBanner";

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_MS = 90_000;

const isActive = (status: InterviewPreparation["generation_status"]) =>
  status === "PENDING" || status === "GENERATING";

const PreparationView = ({
  interviewId,
  initialData,
}: {
  interviewId: ID;
  initialData: InterviewPreparation;
}) => {
  const [prep, setPrep] = useState(initialData);
  const [polling, setPolling] = useState(isActive(initialData.generation_status));
  const [timedOut, setTimedOut] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const pollStartRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!polling) return;
    const timer = setTimeout(async () => {
      if (Date.now() - pollStartRef.current > MAX_POLL_MS) {
        setPolling(false);
        setTimedOut(true);
        return;
      }
      const fresh = await getInterviewPreparation(interviewId).catch(() => null);
      if (fresh) {
        setPrep(fresh);
        if (!isActive(fresh.generation_status)) setPolling(false);
      }
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [polling, prep, interviewId]);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      const fresh = await regenerateInterviewPreparation(interviewId);
      // The regenerate/patch endpoints don't re-send `interview` -- only the
      // initial GET does -- so carry the header forward rather than lose it.
      setPrep(prev => ({ ...fresh, interview: prev.interview }));
      pollStartRef.current = Date.now();
      setTimedOut(false);
      setPolling(true);
      toast.success("Regenerating your brief...");
    } catch (e: any) {
      toast.error(e?.message || "Could not regenerate the brief. Please try again.");
    } finally {
      setRegenerating(false);
    }
  }, [interviewId]);

  const handleQuestionsChange = useCallback(
    async (questions: PreparationQuestion[]) => {
      // Optimistic -- the question list itself already updated local state
      // before calling this.
      try {
        const fresh = await updateInterviewPreparationQuestions(interviewId, questions);
        setPrep(prev => ({ ...fresh, interview: prev.interview }));
      } catch (e: any) {
        toast.error(e?.message || "Could not save your changes.");
      }
    },
    [interviewId]
  );

  const showBanner = polling && !timedOut;
  const showError = prep.generation_status === "FAILED" || (timedOut && !polling);
  const showContent = !showBanner;

  return (
    <div className='dashboard-content-constraint p-6 md:p-8 flex flex-col gap-6 pb-24'>
      <Link
        href={`/recruiter/dashboard/interviews/${interviewId}`}
        className='text-sm text-secondary-black hover:text-primary w-fit print:hidden'
      >
        ← Back to interview
      </Link>

      {showBanner && <GenerationBanner />}

      <div
        className={showBanner ? "opacity-40 pointer-events-none select-none" : "animate-[fadeIn_0.4s_ease]"}
      >
        <PrepHeader interviewId={interviewId} header={prep.interview} />

        {showError ? (
          <div className='mt-6 flex flex-col items-center text-center gap-3 bg-white border border-dashed border-[#D0D5DD] rounded-2lg p-10'>
            <p className='font-semibold text-primaryBlack'>
              We could not generate a brief automatically.
            </p>
            <p className='text-sm text-secondary-black max-w-md'>
              You can still conduct the interview with your own questions.
            </p>
            <button
              type='button'
              onClick={handleRegenerate}
              disabled={regenerating}
              className='btn btn-outline btn-primary rounded-lg mt-2'
            >
              {regenerating ? "Retrying..." : "Retry brief"}
            </button>
            <div className='w-full mt-6 text-left'>
              <QuestionGuide
                questions={prep.questions}
                competencies={prep.competencies}
                onChange={handleQuestionsChange}
              />
            </div>
          </div>
        ) : showContent ? (
          <div className='flex flex-col gap-6 mt-6'>
            <CandidateSnapshot points={prep.candidate_snapshot} />

            <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
              <div className='lg:col-span-3'>
                <CareerTimeline timeline={prep.career_timeline} />
              </div>
              <div className='lg:col-span-2'>
                <StrengthsWatchAreas
                  strengths={prep.strengths}
                  watchAreas={prep.watch_areas}
                />
              </div>
            </div>

            <AssessmentHighlightsCard highlights={prep.assessment_highlights} />

            <QuestionGuide
              questions={prep.questions}
              competencies={prep.competencies}
              onChange={handleQuestionsChange}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PreparationView;
