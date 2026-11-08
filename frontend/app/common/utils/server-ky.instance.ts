import "server-only";
import ky from "ky";
import { cookies } from "next/headers";

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
      },
    ],
  },
});

export default serverKyInstance;
