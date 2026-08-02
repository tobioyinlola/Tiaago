import { publicKyInstance } from "../utils/client-ky.instance";

export const trackTalentNetworkView = async (sessionKey: string) => {
  await publicKyInstance
    .post("talent-network/track-view/", { json: { session_key: sessionKey } })
    .catch(() => {});
};
