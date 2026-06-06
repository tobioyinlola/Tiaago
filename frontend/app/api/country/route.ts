import axios from "axios";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ips =
    request.headers.get("X-Forwarded-For") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for");
  const ip = ips?.split(",")[0];
  const { data } = await axios.get(
    `http://ip-api.com/json/${ip}?fields=${
      searchParams?.get("fields") || "country"
    }`
  );
  return Response.json({ ...data, ip });
}
