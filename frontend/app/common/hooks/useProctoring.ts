"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ProctoringSettings } from "../types";
import {
  ProctoringEventInput,
  completeProctoringSession,
  flushProctoringEvents,
  flushProctoringEventsOnUnload,
} from "../services/assessment-invite-client";

const FLUSH_INTERVAL_MS = 15 * 1000;
const DEVTOOLS_POLL_MS = 200;
const DEVTOOLS_THRESHOLD_PX = 160;
const IDLE_CHECK_MS = 10 * 1000;
const IDLE_THRESHOLD_MS = 60 * 1000;
// Ceiling on how long we wait for the host's answer submission before
// completing the proctoring session anyway. A hung or failed submit must
// never leave the session ACTIVE -- that would let a candidate keep working
// after a violation. Generous enough to cover a slow upload.
const FORCE_SUBMIT_WAIT_MS = 15 * 1000;

type UseProctoringArgs = {
  token: string;
  sessionId: string | null;
  settings: ProctoringSettings | null;
  getCurrentQuestionNumber?: () => number | null;
  // May return a promise -- forceSubmit awaits it so the candidate's
  // in-progress answers are persisted BEFORE the session is completed
  // server-side (completing it grades the attempt). See forceSubmit.
  onForceSubmit: (reason: string) => void | Promise<void>;
  // "ai-interview" wires this same hook into the live AI interview call
  // instead of a written assessment -- see AIInterviewLiveSession.tsx.
  basePath?: "invite" | "ai-interview";
};

/** Single reusable module driving every non-webcam proctoring signal for the
 * live assessment: tab/window visibility, fullscreen, copy/paste/right-click,
 * blocked keyboard shortcuts, devtools-size heuristic, and idle detection.
 * Entirely a no-op if `sessionId`/`settings` are null or proctoring is
 * disabled for the job. Batches events and flushes every 15s, immediately on
 * any VIOLATION, and on unmount. */
export const useProctoring = ({
  token,
  sessionId,
  settings,
  getCurrentQuestionNumber,
  onForceSubmit,
  basePath = "invite",
}: UseProctoringArgs) => {
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showViolationBanner, setShowViolationBanner] = useState(false);
  const [showTabReturnOverlay, setShowTabReturnOverlay] = useState(false);
  const [showFullscreenOverlay, setShowFullscreenOverlay] = useState(false);
  const [showDevtoolsOverlay, setShowDevtoolsOverlay] = useState(false);

  const queueRef = useRef<ProctoringEventInput[]>([]);
  const tabHiddenAtRef = useRef<number | null>(null);
  const fullscreenExitedAtRef = useRef<number | null>(null);
  const devtoolsOpenRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const terminatedRef = useRef(false);
  const tabSwitchCountRef = useRef(0);

  const flush = useCallback(() => {
    if (!sessionId || !queueRef.current.length) return;
    const events = queueRef.current;
    queueRef.current = [];
    flushProctoringEvents(token, sessionId, events, basePath);
  }, [token, sessionId, basePath]);

  const forceSubmit = useCallback(
    async (reason: string) => {
      if (terminatedRef.current || !sessionId) return;
      terminatedRef.current = true;
      queueRef.current.push({
        event_type: "FORCED_SUBMISSION",
        occurred_at: new Date().toISOString(),
        severity: "VIOLATION",
        metadata: { reason },
      });
      flush();

      // Order matters. completeProctoringSession force-completes and GRADES
      // the attempt server-side, so it has to run after the host has
      // persisted whatever the candidate had answered -- otherwise grading
      // races the submit and scores a set of blank backfilled answers.
      // Bounded by FORCE_SUBMIT_WAIT_MS, and a throwing handler must not stop
      // the session being completed either.
      try {
        await Promise.race([
          Promise.resolve(onForceSubmit(reason)),
          new Promise(resolve => setTimeout(resolve, FORCE_SUBMIT_WAIT_MS)),
        ]);
      } catch {
        // Swallowed on purpose: the host surfaces its own submit errors, and
        // the session must still be closed out below.
      }

      await completeProctoringSession(token, sessionId, reason, basePath);
    },
    [flush, onForceSubmit, sessionId, token, basePath]
  );

  const addEvent = useCallback(
    (
      eventType: string,
      severity: ProctoringEventInput["severity"],
      extra?: { duration_seconds?: number; metadata?: Record<string, unknown> }
    ) => {
      if (!sessionId || terminatedRef.current) return;
      queueRef.current.push({
        event_type: eventType,
        occurred_at: new Date().toISOString(),
        severity,
        ...extra,
      });
      if (severity === "VIOLATION") {
        flush();
        if (settings?.force_submit_on_critical_violation) {
          forceSubmit(`Critical violation detected: ${eventType}`);
        }
      }
    },
    [flush, forceSubmit, sessionId, settings]
  );

  const registerTabSwitch = useCallback(() => {
    tabSwitchCountRef.current += 1;
    setTabSwitchCount(tabSwitchCountRef.current);
    if (!settings) return;
    if (tabSwitchCountRef.current >= settings.max_tab_switches_before_termination) {
      forceSubmit(`Exceeded maximum tab switches (${settings.max_tab_switches_before_termination}).`);
    } else if (tabSwitchCountRef.current >= settings.max_tab_switches_before_warning) {
      setShowViolationBanner(true);
    }
  }, [forceSubmit, settings]);

  const dismissTabReturnOverlay = useCallback(() => {
    setShowTabReturnOverlay(false);
    addEvent("TAB_RESTORED", "INFO", { metadata: { dismissed: true } });
  }, [addEvent]);

  const requestReturnToFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const dismissDevtoolsOverlay = useCallback(() => setShowDevtoolsOverlay(false), []);

  useEffect(() => {
    if (!sessionId || !settings?.proctoring_enabled) return;

    const questionMeta = () => {
      const n = getCurrentQuestionNumber?.();
      return n != null ? { question_number: n } : undefined;
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        tabHiddenAtRef.current = Date.now();
        addEvent("TAB_HIDDEN", "WARNING");
      } else if (tabHiddenAtRef.current) {
        const duration = Math.round((Date.now() - tabHiddenAtRef.current) / 1000);
        tabHiddenAtRef.current = null;
        addEvent("TAB_RESTORED", "INFO", { duration_seconds: duration });
        registerTabSwitch();
        setShowTabReturnOverlay(true);
      }
    };

    const onBlur = () => addEvent("WINDOW_BLURRED", "INFO");
    const onFocus = () => addEvent("WINDOW_FOCUSED", "INFO");

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        fullscreenExitedAtRef.current = Date.now();
        addEvent("FULLSCREEN_EXITED", "WARNING");
        if (settings.require_fullscreen) setShowFullscreenOverlay(true);
      } else {
        const duration = fullscreenExitedAtRef.current
          ? Math.round((Date.now() - fullscreenExitedAtRef.current) / 1000)
          : undefined;
        fullscreenExitedAtRef.current = null;
        addEvent("FULLSCREEN_ENTERED", "INFO", duration != null ? { duration_seconds: duration } : undefined);
        setShowFullscreenOverlay(false);
      }
    };

    const onCopy = (e: ClipboardEvent) => {
      if (!settings.copy_paste_blocked) return;
      e.preventDefault();
      addEvent("COPY_DETECTED", "VIOLATION", { metadata: questionMeta() });
      toast.error("Copy and paste are not allowed during this assessment");
    };
    const onCut = (e: ClipboardEvent) => {
      if (!settings.copy_paste_blocked) return;
      e.preventDefault();
      addEvent("COPY_DETECTED", "VIOLATION", { metadata: questionMeta() });
    };
    const onPaste = (e: ClipboardEvent) => {
      if (!settings.copy_paste_blocked) return;
      e.preventDefault();
      addEvent("PASTE_DETECTED", "VIOLATION", { metadata: questionMeta() });
      toast.error("Copy and paste are not allowed during this assessment");
    };

    const onContextMenu = (e: MouseEvent) => {
      if (!settings.right_click_blocked) return;
      e.preventDefault();
      addEvent("RIGHT_CLICK_BLOCKED", "INFO");
      toast.error("Right-clicking is disabled");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      lastActivityRef.current = Date.now();
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key.toLowerCase() === "c" && settings.copy_paste_blocked) {
        e.preventDefault();
        addEvent("COPY_DETECTED", "VIOLATION", { metadata: questionMeta() });
      } else if (ctrl && e.key.toLowerCase() === "v" && settings.copy_paste_blocked) {
        e.preventDefault();
        addEvent("PASTE_DETECTED", "VIOLATION", { metadata: questionMeta() });
      } else if (ctrl && e.key.toLowerCase() === "a") {
        e.preventDefault();
      } else if (ctrl && e.key.toLowerCase() === "p") {
        e.preventDefault();
        addEvent("SCREENSHOT_ATTEMPT", "VIOLATION");
      } else if (e.key === "PrintScreen") {
        // Cannot be preventDefault-ed by any browser -- detection-only.
        addEvent("SCREENSHOT_ATTEMPT", "VIOLATION");
      } else if (e.key === "F12" && settings.devtools_detection_enabled) {
        e.preventDefault();
        addEvent("KEYBOARD_SHORTCUT_BLOCKED", "INFO", { metadata: { key: "F12" } });
      }
    };

    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousemove", onActivity);
    document.addEventListener("keypress", onActivity);

    let idleNotified = false;
    const idleInterval = setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= IDLE_THRESHOLD_MS) {
        if (!idleNotified) {
          idleNotified = true;
          addEvent("IDLE_DETECTED", "INFO", { duration_seconds: Math.round(idleFor / 1000) });
          toast("Are you still there? The assessment is waiting for you.");
        }
      } else {
        idleNotified = false;
      }
    }, IDLE_CHECK_MS);

    let devtoolsInterval: ReturnType<typeof setInterval> | null = null;
    if (settings.devtools_detection_enabled) {
      devtoolsInterval = setInterval(() => {
        const isOpen =
          window.outerWidth - window.innerWidth > DEVTOOLS_THRESHOLD_PX ||
          window.outerHeight - window.innerHeight > DEVTOOLS_THRESHOLD_PX;
        if (isOpen && !devtoolsOpenRef.current) {
          devtoolsOpenRef.current = true;
          addEvent("DEVTOOLS_DETECTED", "VIOLATION");
          setShowDevtoolsOverlay(true);
        } else if (!isOpen) {
          devtoolsOpenRef.current = false;
        }
      }, DEVTOOLS_POLL_MS);
    }

    const flushInterval = setInterval(flush, FLUSH_INTERVAL_MS);

    const onBeforeUnload = () => {
      flushProctoringEventsOnUnload(token, sessionId, queueRef.current, basePath);
      queueRef.current = [];
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousemove", onActivity);
      document.removeEventListener("keypress", onActivity);
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearInterval(idleInterval);
      if (devtoolsInterval) clearInterval(devtoolsInterval);
      clearInterval(flushInterval);
      flushProctoringEventsOnUnload(token, sessionId, queueRef.current, basePath);
      queueRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, settings?.proctoring_enabled]);

  return {
    tabSwitchCount,
    showViolationBanner,
    showTabReturnOverlay,
    dismissTabReturnOverlay,
    showFullscreenOverlay,
    requestReturnToFullscreen,
    showDevtoolsOverlay,
    dismissDevtoolsOverlay,
  };
};
