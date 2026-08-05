import type { AIInterviewConnectInfo } from "@/app/common/services/ai-interviews";

/** sessionStorage (not localStorage -- this must not survive across tabs or
 * outlive the browsing session) key the pre-join page writes to right after
 * a successful start-session call, and the session page reads from on
 * mount. Never put the LiveKit token in the URL or in a cookie. */
export const AI_INTERVIEW_SESSION_STORAGE_KEY = "tiaago_ai_interview_session_v1";

/** Only ever written once startAIInterviewSession resolves to the non-queued
 * (queued: false) variant -- a queued response never reaches sessionStorage
 * or the session page, see AIInterviewPreJoinFlow. */
export type AIInterviewSessionData = AIInterviewConnectInfo & {
  cameraEnabled: boolean;
  candidateFirstName: string;
  jobTitle: string;
  companyName: string;
  durationMinutes: number;
  questionsTotal: number;
};
