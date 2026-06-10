import { API_URL } from "../constants";

// Render's free tier sleeps the backend after 15 idle minutes and takes about
// a minute to wake. Pinging the public root as early as possible lets the
// spin-up overlap with the user's first pageview. Raw fetch with no-cors is
// deliberate: the response is opaque and unread — reaching Render's proxy is
// what wakes the service — and axios cannot make opaque requests.
export const warmupBackend = () => {
  try {
    const origin = new URL(API_URL).origin;
    fetch(`${origin}/`, { mode: "no-cors", cache: "no-store" }).catch(() => {});
  } catch {
    // Malformed API_URL — nothing to warm.
  }
};
