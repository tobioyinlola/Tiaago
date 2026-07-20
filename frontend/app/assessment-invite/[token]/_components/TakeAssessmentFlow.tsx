"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addMinutes } from "date-fns";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import DaisyButton from "@/app/common/components/DaisyButton";
import BrandLink from "@/app/common/components/BrandLink";
import ProctoringWarningOverlay from "@/app/common/components/dashboard/ProctoringWarningOverlay";
import ProctoringViolationBanner from "@/app/common/components/dashboard/ProctoringViolationBanner";
import { CodingTaskSection, CompanySkillAssessment, MCQSection } from "@/app/common/types";
import AssessmentMCQQuiz from "@/app/assessments/_components/AssessmentMCQQuiz";
import AssessmentCodingTask from "@/app/assessments/_components/AssessmentCodingTask";
import { submitAssessmentInviteAnswers } from "@/app/common/services/assessment-invite";
import { completeProctoringSession } from "@/app/common/services/assessment-invite-client";
import { useProctoring } from "@/app/common/hooks/useProctoring";
import { useInviteFlow } from "./InviteFlowProvider";

/** Drives a candidate through every section of the assessment, one at a time:
 * finish a section, see an explicit "section complete" screen, continue to
 * the next -- rather than silently chaining sections together. Submits to
 * the backend after each section (partial submission is supported server-
 * side), and only routes to /submitted once the last section is done. */
const TakeAssessmentFlow = ({ assessment }: { assessment: CompanySkillAssessment }) => {
  const router = useRouter();
  const { token, proctoring, proctoringSessionId } = useInviteFlow();

  const {
    showViolationBanner,
    tabSwitchCount,
    showTabReturnOverlay,
    dismissTabReturnOverlay,
    showFullscreenOverlay,
    requestReturnToFullscreen,
    showDevtoolsOverlay,
    dismissDevtoolsOverlay,
  } = useProctoring({
    token,
    sessionId: proctoringSessionId,
    settings: proctoring,
    // Submit whatever's currently answered (same partial-submission path as
    // a time-expiry) instead of discarding it and dead-ending on a page
    // that never recorded any data -- the proctoring session itself was
    // already marked terminated by useProctoring's forceSubmit before this
    // fires.
    onForceSubmit: () => setForceSubmitSignal(s => s + 1),
  });

  const sections = assessment.sections;
  const [sectionIndex, setSectionIndex] = useState(0);
  const [showSectionComplete, setShowSectionComplete] = useState(false);
  const [forceSubmitSignal, setForceSubmitSignal] = useState(0);

  const currentSection = sections[sectionIndex];
  const isLastSection = sectionIndex === sections.length - 1;

  // Overall timer, computed once from the server-recorded start time --
  // not per section, and not reset by a page refresh, since started_at is a
  // fixed point fetched fresh from the backend on every load.
  const endDateTime = useMemo(() => {
    const anchor = assessment.started_at ? new Date(assessment.started_at) : new Date();
    return addMinutes(anchor, assessment.duration_minutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishAssessment = () => {
    if (proctoringSessionId) completeProctoringSession(token, proctoringSessionId);
    router.push(`/assessment-invite/${token}/submitted`);
  };

  const handleSectionComplete = () => {
    if (isLastSection) {
      finishAssessment();
    } else {
      setShowSectionComplete(true);
    }
  };

  // Time ran out -- whatever's answered in the current section has already
  // been submitted by the child component; skip any remaining sections and
  // go straight to done rather than showing "continue to next section".
  const handleTimeExpired = () => {
    finishAssessment();
  };

  const handleContinueToNext = () => {
    setSectionIndex(i => i + 1);
    setShowSectionComplete(false);
  };

  if (!currentSection) return null;

  const proctoringOverlays = (
    <>
      {showViolationBanner && <ProctoringViolationBanner count={tabSwitchCount} />}
      <ProctoringWarningOverlay
        open={showTabReturnOverlay}
        title="Welcome back"
        message="We noticed you left the assessment tab. Please stay on this tab for the rest of the assessment."
        actionLabel="I'm back"
        onAction={dismissTabReturnOverlay}
      />
      <ProctoringWarningOverlay
        open={showFullscreenOverlay}
        title='Please return to fullscreen'
        message='This assessment must be taken in fullscreen mode. Exiting fullscreen has been recorded.'
        actionLabel='Return to fullscreen'
        onAction={requestReturnToFullscreen}
      />
      <ProctoringWarningOverlay
        open={showDevtoolsOverlay}
        title='Developer tools detected'
        message='Browser developer tools have been detected. This has been recorded.'
        actionLabel='Continue'
        onAction={dismissDevtoolsOverlay}
      />
    </>
  );

  if (showSectionComplete) {
    const nextSection = sections[sectionIndex + 1];
    return (
      <>
        {proctoringOverlays}
        <div className='min-h-screen w-full bg-white flex flex-col'>
          <header className='w-full px-6 md:px-10 py-5'>
            <BrandLink containerClassName='block w-fit' />
          </header>
          <div className='flex-1 flex items-center justify-center px-6 py-16'>
            <div className='max-w-md w-full text-center'>
              <div className='mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-6'>
                <CheckCircle2 className='h-8 w-8 text-success' />
              </div>
              <p className='text-sm font-semibold text-primary uppercase tracking-wide mb-2'>
                Section {sectionIndex + 1} of {sections.length} complete
              </p>
              <h2 className='text-2xl font-bold text-primary-black mb-3'>{currentSection.name}, done!</h2>
              {nextSection && (
                <p className='text-secondary-black mb-10'>
                  Up next: <span className='font-medium text-primary-black'>{nextSection.name}</span>
                </p>
              )}
              <DaisyButton color='primary' className='text-white gap-2 px-8' onClick={handleContinueToNext}>
                Continue to Section {sectionIndex + 2} <ArrowRight className='h-4 w-4' />
              </DaisyButton>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (currentSection.type === "CODING_TASK") {
    return (
      <>
        {proctoringOverlays}
        <AssessmentCodingTask
          key={currentSection.id}
          codeSection={currentSection as CodingTaskSection}
          assessment={assessment}
          mode='invite'
          skipIntro
          submitOverride={data => submitAssessmentInviteAnswers(token, data)}
          onComplete={handleSectionComplete}
          sharedEndDateTime={endDateTime}
          onTimeExpired={handleTimeExpired}
          forceSubmitSignal={forceSubmitSignal}
        />
      </>
    );
  }

  return (
    <>
      {proctoringOverlays}
      <AssessmentMCQQuiz
        key={currentSection.id}
        mcqSection={currentSection as MCQSection}
        assessment={assessment}
        mode='invite'
        skipIntro
        submitOverride={data => submitAssessmentInviteAnswers(token, data)}
        onComplete={handleSectionComplete}
        sharedEndDateTime={endDateTime}
        onTimeExpired={handleTimeExpired}
        forceSubmitSignal={forceSubmitSignal}
      />
    </>
  );
};

export default TakeAssessmentFlow;
