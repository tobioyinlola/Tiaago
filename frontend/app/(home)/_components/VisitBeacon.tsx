"use client";

import { useEffect } from "react";

import { trackVisit } from "@/app/common/services/visit-tracking";

const SESSION_KEY_STORAGE = "tiaago-visit-session";
const LAST_PING_STORAGE = "tiaago-visit-last-ping";

/** Fires once per browser session per day on public pages, so the admin
 * traffic chart has a lightweight visit count. Not loaded on authenticated
 * dashboard routes (see app/(home)/layout.tsx, which is the only place this
 * is mounted). */
const VisitBeacon = () => {
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(LAST_PING_STORAGE) === today) return;

    let sessionKey = localStorage.getItem(SESSION_KEY_STORAGE);
    if (!sessionKey) {
      sessionKey = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY_STORAGE, sessionKey);
    }

    trackVisit(sessionKey).then(() => {
      localStorage.setItem(LAST_PING_STORAGE, today);
    });
  }, []);

  return null;
};

export default VisitBeacon;
