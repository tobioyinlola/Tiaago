import ky from "ky";

import { API_URL } from "../constants";
import { getAuthCookiesAsync } from "../actions";

const clientKyInstance = ky.create({
  prefixUrl: API_URL,
  timeout: 120000,
  hooks: {
    beforeRequest: [
      async request => {
        const res = await getAuthCookiesAsync();
        const access = res?.access;
        if (access) {
          request.headers.set("Authorization", `Bearer ${access.value}`);
        }
      },
    ],
  },
});

export default clientKyInstance;

export const publicKyInstance = ky.create({
  prefixUrl: API_URL,
  timeout: 120000,
});
