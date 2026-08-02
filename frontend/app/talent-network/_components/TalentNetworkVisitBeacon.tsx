"use client";

import { useEffect } from "react";

import { trackTalentNetworkView } from "@/app/common/services/talent-network-visit-tracking";

const SESSION_KEY_STORAGE = "tiaago-tn-visit-session";
const LAST_PING_STORAGE = "tiaago-tn-visit-last-ping";

/** Fires once per browser session per day on the /talent-network join page,
 * so the admin Talent Network overview has a page-view count independent of
 * the site-wide visit tracker (see app/(home)/_components/VisitBeacon.tsx,
 * which this mirrors but with its own storage keys and endpoint so the two
 * never collide or double-count). */
const TalentNetworkVisitBeacon = () => {
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(LAST_PING_STORAGE) === today) return;

    let sessionKey = localStorage.getItem(SESSION_KEY_STORAGE);
    if (!sessionKey) {
      sessionKey = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY_STORAGE, sessionKey);
    }

    trackTalentNetworkView(sessionKey).then(() => {
      localStorage.setItem(LAST_PING_STORAGE, today);
    });
  }, []);

  return null;
};

export default TalentNetworkVisitBeacon;
