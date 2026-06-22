"use server";

import { Staff } from "../types";
import serverKyInstance from "../utils/server-ky.instance";

export const updateStaff = async (
  input: Partial<Staff> | FormData,
  endpoint: "profile" | "me" = "me"
): Promise<Staff> => {
  const options =
    input instanceof FormData ? { body: input } : { json: input };
  const responseData = await serverKyInstance
    .patch(`auth/users/${endpoint}`, options)
    .json<{ user: Staff; [key: string]: any }>();
  const { user, ...rest } = responseData;
  return { ...user, ...rest };
};
