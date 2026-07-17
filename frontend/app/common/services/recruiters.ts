"use server";

import { Recruiter } from "../types";
import serverKyInstance from "../utils/server-ky.instance";

export const updateRecruiter = async (
  input: Partial<Recruiter> | FormData,
  endpoint: "profile" | "me" = "me"
): Promise<Recruiter> => {
  const options =
    input instanceof FormData ? { body: input } : { json: input };
  const responseData = await serverKyInstance
    .patch(`auth/users/${endpoint}`, options)
    .json<{ user: Recruiter; [key: string]: any }>();
  const { user, ...rest } = responseData;
  return { ...user, ...rest };
};
