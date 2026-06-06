import { Startup } from "../types";
import axiosInstance from "../utils/axios.instance";

export const updateStartup = (
  input: Partial<Startup> | FormData,
  endpoint: "profile" | "me" = "me"
) =>
  new Promise<Startup>(async (resolve, reject) => {
    try {
      const {
        data: { user, ...rest },
      } = await axiosInstance.patch<{ user: Startup }>(
        `/auth/users/${endpoint}`,
        input
      );
      resolve({ ...user, ...rest });
    } catch (error) {
      reject(error);
    }
  });
