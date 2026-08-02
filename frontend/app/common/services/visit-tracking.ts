import { publicKyInstance } from "../utils/client-ky.instance";

export const trackVisit = async (sessionKey: string) => {
  await publicKyInstance
    .post("analytics/track-visit/", { json: { session_key: sessionKey } })
    .catch(() => {});
};
