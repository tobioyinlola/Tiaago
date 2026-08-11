"use client";

import Daily, { DailyCall } from "@daily-co/daily-js";
import { DailyProvider } from "@daily-co/daily-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ID, InterviewCompetency, PreparationQuestion } from "@/app/common/types";
import { startInterview, endInterview } from "@/app/common/services/interview-workspace";
import { getInterviewPreparation, updateInterviewPreparationQuestions } from "@/app/common/services/interview-preparation";
import { useInterviewTranscription } from "@/app/common/hooks/useInterviewTranscription";
import VideoColumn from "./VideoColumn";
import QuestionsPanel from "./QuestionsPanel";
import NotesEditor from "./NotesEditor";
import AICopilotPanel from "./AICopilotPanel";
import ScorecardDrawer from "./ScorecardDrawer";
import InterviewTimer from "./InterviewTimer";
import EndInterviewModal from "./EndInterviewModal";

type Phase = "starting" | "in-call" | "error";

const WorkspaceView = ({
  interviewId,
  candidateName,
  jobTitle,
  durationMinutes,
  recordingEnabled,
  accessToken,
}: {
  interviewId: ID;
  candidateName: string;
  jobTitle: string;
  durationMinutes: number;
  recordingEnabled: boolean;
  accessToken: string;
}) => {
  const router = useRouter();
  const startedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("starting");
  const [errorMessage, setErrorMessage] = useState("");
  const [call, setCall] = useState<DailyCall | null>(null);
  const [roomUrl, setRoomUrl] = useState("");
  const [participantToken, setParticipantToken] = useState("");
  const [transcriptionWsUrl, setTranscriptionWsUrl] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());

  const [questions, setQuestions] = useState<PreparationQuestion[]>([]);
  const [competencies, setCompetencies] = useState<InterviewCompetency[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<PreparationQuestion | null>(null);

  const [notesAppendText, setNotesAppendText] = useState<{ text: string; token: number } | null>(null);
  const appendToNotes = (text: string) =>
    setNotesAppendText({ text, token: Date.now() });

  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [ending, setEnding] = useState(false);

  const { segments, suggestions, evidenceByCompetency, sendActiveQuestion } = useInterviewTranscription({
    wsUrl: transcriptionWsUrl,
    accessToken,
    call,
    startedAt,
    enabled: phase === "in-call",
  });

  const handleSetActive = (question: PreparationQuestion | null) => {
    setActiveQuestion(question);
    sendActiveQuestion(question?.text ?? null);
  };

  // Full viewport, no page scroll -- restore on unmount.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      const result = await startInterview(interviewId, recordingEnabled);
      if (!result.success) {
        if (result.error?.toLowerCase().includes("insufficient")) {
          toast.error("Your wallet balance is too low to start this interview.");
          router.replace(
            `/recruiter/dashboard/billing?reason=insufficient_funds&interview=${interviewId}`
          );
          return;
        }
        setErrorMessage(result.error || "Could not start the interview.");
        setPhase("error");
        return;
      }

      setRoomUrl(result.data.roomUrl);
      setParticipantToken(result.data.participantToken);
      setTranscriptionWsUrl(result.data.transcriptionWebsocketUrl || null);
      const callObject = Daily.createCallObject();
      setCall(callObject);
      setPhase("in-call");
    })();

    return () => {
      call?.leave().catch(() => {});
      call?.destroy().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  useEffect(() => {
    getInterviewPreparation(interviewId)
      .then(prep => {
        setQuestions(prep.questions || []);
        setCompetencies(prep.competencies || []);
      })
      .catch(() => {});
  }, [interviewId]);

  const persistQuestions = async (next: PreparationQuestion[]) => {
    setQuestions(next);
    try {
      await updateInterviewPreparationQuestions(interviewId, next);
    } catch {
      toast.error("Could not save question progress.");
    }
  };

  const handleEndInterview = async () => {
    setEnding(true);
    const result = await endInterview(interviewId);
    setEnding(false);
    setEndModalOpen(false);
    if (!result.success) {
      toast.error(result.error || "Could not end the interview. Please try again.");
      return;
    }
    call?.leave().catch(() => {});
    router.push(`/recruiter/dashboard/interviews/${interviewId}/processing`);
  };

  if (phase === "error") {
    return (
      <div className='fixed inset-0 bg-white flex items-center justify-center p-6'>
        <div className='border border-[#EAECF0] rounded-2lg p-8 max-w-md text-center flex flex-col items-center gap-3'>
          <p className='font-semibold text-primaryBlack'>Could not start this interview</p>
          <p className='text-sm text-secondary-black'>{errorMessage}</p>
          <button
            type='button'
            onClick={() => router.push(`/recruiter/dashboard/interviews/${interviewId}`)}
            className='btn btn-primary text-white rounded-lg mt-2'
          >
            Back to interview
          </button>
        </div>
      </div>
    );
  }

  if (phase === "starting" || !call) {
    return (
      <div className='fixed inset-0 bg-white flex flex-col items-center justify-center gap-3'>
        <span className='loading loading-dots loading-lg text-primary' />
        <p className='text-secondary-black text-sm'>Setting up your interview room...</p>
      </div>
    );
  }

  return (
    <DailyProvider callObject={call}>
      <div className='fixed inset-0 flex flex-col bg-[#F5F6F7]'>
        <header className='h-14 shrink-0 bg-white border-b border-[#EAECF0] flex items-center justify-between px-4'>
          <div className='flex items-center gap-3 min-w-0'>
            <p className='text-primaryBlack text-sm font-medium truncate'>{candidateName}</p>
            <span className='text-secondary-black text-xs truncate max-sm:hidden'>{jobTitle}</span>
          </div>
          <InterviewTimer startedAt={startedAt} durationMinutes={durationMinutes} />
          <div className='flex items-center gap-3'>
            {recordingEnabled && (
              <span className='flex items-center gap-1.5'>
                <span className='w-2 h-2 rounded-full bg-red-500 animate-pulse' />
                <span className='text-primaryBlack text-xs font-medium'>REC</span>
              </span>
            )}
            <button
              type='button'
              onClick={() => setEndModalOpen(true)}
              className='btn btn-sm rounded-lg !bg-red-600 !text-white border-none hover:!bg-red-700'
            >
              End Interview
            </button>
          </div>
        </header>

        <div className='flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-10 gap-px bg-[#EAECF0]'>
          <div className='lg:col-span-3 bg-black min-h-0'>
            <VideoColumn roomUrl={roomUrl} token={participantToken} candidateName={candidateName} />
          </div>

          <div className='lg:col-span-4 bg-[#F5F6F7] min-h-0 flex flex-col gap-px overflow-hidden'>
            <div className='flex-[55] min-h-0 bg-white overflow-y-auto'>
              <QuestionsPanel
                questions={questions}
                competencies={competencies}
                onChange={persistQuestions}
                onSetActive={handleSetActive}
                onUseFollowup={appendToNotes}
              />
            </div>
            <div className='flex-[45] min-h-0 bg-white overflow-hidden'>
              <NotesEditor interviewId={interviewId} appendSignal={notesAppendText} />
            </div>
          </div>

          <div className='lg:col-span-3 bg-white min-h-0 overflow-y-auto'>
            <AICopilotPanel
              interviewId={interviewId}
              activeQuestion={activeQuestion}
              questions={questions}
              competencies={competencies}
              durationMinutes={durationMinutes}
              startedAt={startedAt}
              onUseFollowup={appendToNotes}
              segments={segments}
              suggestions={suggestions}
              evidenceByCompetency={evidenceByCompetency}
            />
          </div>
        </div>

        <ScorecardDrawer
          interviewId={interviewId}
          open={scorecardOpen}
          onToggle={() => setScorecardOpen(o => !o)}
        />

        <EndInterviewModal
          open={endModalOpen}
          ending={ending}
          onCancel={() => setEndModalOpen(false)}
          onConfirm={handleEndInterview}
        />
      </div>
    </DailyProvider>
  );
};

export default WorkspaceView;
