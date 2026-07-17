import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import type { GetProfileArgs } from "../types";

export const ALLOW_NULL_ARGS: GetProfileArgs = { allowNull: true };

export const BASE_URL =
  process.env.NODE_ENV === "development"
    ? typeof window === "undefined"
      ? "http://localhost:3000"
      : "http://" + window.location.host
    : typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_VERCEL ?? "https://tiaago.com"
      : "https://" + window.location.host;

// API_URL: in production, NEXT_PUBLIC_API_URL MUST be set on Vercel
// (the fallback intentionally does not point at a real domain — we want
// the app to throw loud at first request rather than silently call a dead URL).
function resolveApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:8000/api";
  }
  throw new Error(
    "NEXT_PUBLIC_API_URL is not set. Set it on Vercel to your Render backend URL " +
    "(e.g. https://tiaago-backend-web.onrender.com/api) before deploying.",
  );
}
export const API_URL = resolveApiUrl();

// `wss://${apiUrlDomain}/ws/pre-screening/interview/?my-app-auth=${authToken}`;

export const ACCESS_TOKEN_KEY = "tiaago_access";
export const REFRESH_TOKEN_KEY = "tiaago_refresh";
export const ACCESS_TOKEN_EXPIRY = 60 * 60 * 24 * 7; // 7 days
export const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 30; // 30 days

// IS_DEV is read from the build-time NODE_ENV, not hardcoded.
// Payment-bypass logic in this codebase must never assume IS_DEV === payment-free.
export const IS_DEV = process.env.NODE_ENV === "development";

export const SUPPORT_EMAIL = "support@tiaago.com";
export const CONTACT_EMAIL = SUPPORT_EMAIL;
export const CONTACT_PHONE = "+44 7883 407881";

export const PASS_THRESHOLD = 70;

export const FREE_RECRUITER_MAX_JOB_POSTS_PER_MONTH = 3;
export const FREE_RECRUITER_MAX_MEETINGS_PER_MONTH = 2;

export const FREE_TALENT_MAX_JOB_APPLICATIONS_PER_MONTH = 3;

export const BASIC_RECRUITER_MAX_JOB_POSTS_PER_MONTH = 10;

export const IS_CHAT_HIDDEN = true;

export const socialLinks = [
  {
    name: "Facebook",
    url: "#",
    Icon: Facebook,
  },
  {
    url: "https://www.instagram.com/tiaago_hq?igsh=MWszZTN5NDM1MzdlMA==",
    Icon: Instagram,
  },
  {
    url: "https://x.com/TiaagoHq?s=09",
    Icon: Twitter,
  },
  {
    url: "https://www.linkedin.com/company/tiaagohq/",
    Icon: Linkedin,
  },
];
