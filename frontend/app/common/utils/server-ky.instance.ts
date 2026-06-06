import "server-only";
import ky from "ky";
import { cookies } from "next/headers";

import { ACCESS_TOKEN_KEY, API_URL } from "../constants";

const serverKyInstance = ky.create({
  prefixUrl: API_URL,
  cache: "no-cache",
  timeout: 25000,
  hooks: {
    beforeRequest: [
      async request => {
        const cookieStore = await cookies();
        const access = cookieStore.get(ACCESS_TOKEN_KEY);
        // console.log("Access token:", access?.value)
        if (access) {
          request.headers.set("Authorization", `Bearer ${access.value}`);
        }
      },
    ],
  },
});

export default serverKyInstance;
