"use server";

import { Startup } from "../types";
import serverKyInstance from "../utils/server-ky.instance";

export const updateStartup = async (
  input: Partial<Startup> | FormData,
  endpoint: "profile" | "me" = "me"
): Promise<Startup> => {
  const options =
    input instanceof FormData ? { body: input } : { json: input };
  const responseData = await serverKyInstance
    .patch(`auth/users/${endpoint}`, options)
    .json<{ user: Startup; [key: string]: any }>();
  const { user, ...rest } = responseData;
  return { ...user, ...rest };
};
