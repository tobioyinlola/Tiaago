import "server-only";
import ky from "ky";
import { cookies, headers } from "next/headers";

import { ACCESS_TOKEN_KEY, API_URL } from "../constants";
import { serverFetch } from "./server-fetch.mjs";

const serverKyInstance = ky.create({
  prefixUrl: API_URL,
  timeout: 25000,
  fetch: serverFetch,
  hooks: {
    beforeRequest: [
      async request => {
        const cookieStore = await cookies();
        const access = cookieStore.get(ACCESS_TOKEN_KEY);
        if (access) {
          request.headers.set("Authorization", `Bearer ${access.value}`);
        }
        // Tell the API which host this user is on so the links it returns
        // (e.g. a job's public URL) stay on that host. The API only honours
        // origins it already trusts, so this cannot redirect links elsewhere.
        try {
          const incoming = await headers();
          const host = incoming.get("x-forwarded-host") || incoming.get("host");
          if (host) {
            const proto =
              incoming.get("x-forwarded-proto")?.split(",")[0].trim() ||
              (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
            request.headers.set("X-Frontend-Origin", `${proto}://${host}`);
          }
        } catch {
          // Outside a request (build / static generation): the API default applies.
        }
      },
    ],
  },
});

export default serverKyInstance;
