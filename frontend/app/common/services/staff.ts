import { Staff } from "../types";
import axiosInstance from "../utils/axios.instance";

export const updateStaff = (
  input: Partial<Staff> | FormData,
  endpoint: "profile" | "me" = "me"
) =>
  new Promise<Staff>(async (resolve, reject) => {
    try {
      const {
        data: { user, ...rest },
      } = await axiosInstance.patch<{ user: Staff }>(
        `/auth/users/${endpoint}`,
        input
      );
      resolve({ ...user, ...rest });
    } catch (error) {
      reject(error);
    }
  });
