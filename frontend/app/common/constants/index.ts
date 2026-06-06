import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react";

export const BASE_URL =
  process.env.NODE_ENV === "development"
    ? typeof window === "undefined"
      ? "http://localhost:3000"
      : "http://" + window.location.host
    : typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_VERCEL ?? "https://tiaago.com"
      : "https://" + window.location.host;

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://backend.tiaago.com/api";
// "https://prod-backend-production-4495.up.railway.app/api";

// `wss://${apiUrlDomain}/ws/pre-screening/interview/?my-app-auth=${authToken}`;

export const ACCESS_TOKEN_KEY = "tiaago_access";
export const REFRESH_TOKEN_KEY = "tiaago_refresh";
export const ACCESS_TOKEN_EXPIRY = 60 * 60 * 24 * 7; // 7 days
export const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 30; // 30 days

export const IS_DEV = true; // process.env.NODE_ENV === "development";

export const SUPPORT_EMAIL = "support@tiaago.com";
export const CONTACT_EMAIL = SUPPORT_EMAIL;
export const CONTACT_PHONE = "+44 7883 407881";

export const PASS_THRESHOLD = 70;

export const FREE_STARTUP_MAX_JOB_POSTS_PER_MONTH = 3;
export const FREE_STARTUP_MAX_MEETINGS_PER_MONTH = 2;

export const FREE_TALENT_MAX_JOB_APPLICATIONS_PER_MONTH = 3;

export const BASIC_STARTUP_MAX_JOB_POSTS_PER_MONTH = 10;

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
