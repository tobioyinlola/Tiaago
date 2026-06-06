"use server";

import { cookies } from "next/headers";

import {
  ACCESS_TOKEN_EXPIRY,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_EXPIRY,
  REFRESH_TOKEN_KEY,
} from "../constants";

export type TokensInput = {
  access: string;
  refresh?: string;
  access_expiration: string;
  refresh_expiration?: string;
};

export const setAuthCookies = async ({
  access,
  refresh,
  access_expiration,
  refresh_expiration,
}: TokensInput) => {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_KEY, access, {
    httpOnly: true,
    sameSite: true,
    ...(access_expiration
      ? { expires: new Date(access_expiration) }
      : {
          maxAge: ACCESS_TOKEN_EXPIRY,
        }),
  });
  if (refresh) {
    cookieStore.set(REFRESH_TOKEN_KEY, refresh, {
      httpOnly: true,
      sameSite: true,
      ...(refresh_expiration
        ? { expires: new Date(refresh_expiration) }
        : {
            maxAge: REFRESH_TOKEN_EXPIRY,
          }),
    });
  }
};

export const removeAuthCookies = async () => {
  const cookieStore = await cookies();
  if (cookieStore.has(ACCESS_TOKEN_KEY))
    cookieStore.delete({
      name: ACCESS_TOKEN_KEY,
    });
  if (cookieStore.has(REFRESH_TOKEN_KEY))
    cookieStore.delete({
      name: REFRESH_TOKEN_KEY,
    });
  return true;
};

export const getAuthCookies = async () => {
  const cookieStore = await cookies();
  const access = cookieStore.get(ACCESS_TOKEN_KEY);
  const refresh = cookieStore.get(REFRESH_TOKEN_KEY);
  return { access, refresh };
};

export const getAuthCookiesAsync = async () => {
  const cookieStore = await cookies();
  const access = cookieStore.get(ACCESS_TOKEN_KEY);
  const refresh = cookieStore.get(REFRESH_TOKEN_KEY);
  return { access, refresh };
};
