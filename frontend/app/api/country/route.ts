import ky from "ky";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ips =
    request.headers.get("X-Forwarded-For") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for");
  const ip = ips?.split(",")[0];
  const data = await ky.get(
    `http://ip-api.com/json/${ip}?fields=${
      searchParams?.get("fields") || "country"
    }`
  ).json();
  return Response.json({ ...data as Record<string, unknown>, ip });
}
