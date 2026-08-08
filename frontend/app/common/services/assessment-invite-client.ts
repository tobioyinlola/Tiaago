import { publicKyInstance } from "../utils/client-ky.instance";
import { API_URL } from "../constants";

export const uploadAssessmentInviteSnapshot = async (
  token: string,
  blob: Blob
): Promise<{ success: boolean }> => {
  try {
    const formData = new FormData();
    formData.set("image", blob, "snapshot.jpg");
    await publicKyInstance.post(`skill-assessments/invite/${token}/snapshot/`, {
      body: formData,
    });
    return { success: true };
  } catch {
    return { success: false };
  }
};

export type ProctoringEventInput = {
  event_type: string;
  occurred_at: string;
  duration_seconds?: number;
  metadata?: Record<string, unknown>;
  severity: "INFO" | "WARNING" | "VIOLATION";
};

// "invite" (the default) is the skill-assessment flow's proctoring routes;
// "ai-interview" is the same set of routes under a different backend prefix
// (see proctoring/urls.py) for the live AI interview call -- same session/
// event/complete shape either way, just a different parent resource.
type ProctoringBasePath = "invite" | "ai-interview";

export const createProctoringSession = async (
  token: string,
  basePath: ProctoringBasePath = "invite"
): Promise<{ sessionId: string } | null> => {
  try {
    const data = await publicKyInstance
      .post(`proctoring/${basePath}/${token}/session/`)
      .json<{ session_id: string }>();
    return { sessionId: data.session_id };
  } catch {
    return null;
  }
};

/** Fire-and-forget batch flush -- best-effort, proctoring never blocks the
 * candidate on a failed network call. */
export const flushProctoringEvents = (
  token: string,
  sessionId: string,
  events: ProctoringEventInput[],
  basePath: ProctoringBasePath = "invite"
) => {
  if (!events.length) return;
  publicKyInstance
    .post(`proctoring/${basePath}/${token}/sessions/${sessionId}/events/`, { json: { events } })
    .catch(() => {});
};

/** Best-effort flush on unmount/tab-close via sendBeacon where available
 * (survives page teardown, unlike a regular fetch); falls back to a
 * fire-and-forget keepalive fetch. */
export const flushProctoringEventsOnUnload = (
  token: string,
  sessionId: string,
  events: ProctoringEventInput[],
  basePath: ProctoringBasePath = "invite"
) => {
  if (!events.length) return;
  const url = `${API_URL}proctoring/${basePath}/${token}/sessions/${sessionId}/events/`;
  const body = JSON.stringify({ events });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(url, blob);
    return;
  }
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
};

export const completeProctoringSession = async (
  token: string,
  sessionId: string,
  terminatedReason?: string,
  basePath: ProctoringBasePath = "invite"
): Promise<{ status: string; integrity_score: number; risk_level: string } | null> => {
  try {
    return await publicKyInstance
      .post(`proctoring/${basePath}/${token}/sessions/${sessionId}/complete/`, {
        json: terminatedReason ? { terminated_reason: terminatedReason } : {},
      })
      .json();
  } catch {
    return null;
  }
};
