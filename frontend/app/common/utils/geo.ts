"use server";

import { headers } from "next/headers";

/** Best-effort visitor country from Vercel's edge geo header (this app is
 * deployed on Vercel -- see vercel.json -- so x-vercel-ip-country is set on
 * every request without needing a separate IP-geolocation lookup or API
 * call). Undefined off Vercel (local dev, other hosts) so callers fall back
 * to a sensible default instead of guessing wrong. */
export const getVisitorCountryCode = async (): Promise<string | undefined> => {
  const headersList = await headers();
  return headersList.get("x-vercel-ip-country") || undefined;
};

/** Nigeria sees Naira; everywhere else -- and anywhere the geo header isn't
 * available (local dev, non-Vercel hosting) -- sees Dollars. */
export const getDefaultCurrency = async (): Promise<"NGN" | "USD"> => {
  const country = await getVisitorCountryCode();
  return country === "NG" ? "NGN" : "USD";
};
