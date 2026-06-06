import { cookies } from "next/headers";

import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/app/common/constants";

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete({
    httpOnly: true,
    sameSite: true,
    name: ACCESS_TOKEN_KEY,
  });
  cookieStore.delete({
    httpOnly: true,
    sameSite: true,
    name: REFRESH_TOKEN_KEY,
  });
  return Response.json({ success: true });
}
