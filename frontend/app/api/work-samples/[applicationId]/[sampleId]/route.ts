import { cookies } from "next/headers";

import { ACCESS_TOKEN_KEY, API_URL } from "@/app/common/constants";

export const dynamic = "force-dynamic";

/** Browser-safe download proxy: the private backend file never receives a
 * public URL, and the server forwards the recruiter's access token. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string; sampleId: string }> }
) {
  const { applicationId, sampleId } = await params;
  const token = (await cookies()).get(ACCESS_TOKEN_KEY)?.value;
  if (!token) return new Response("Unauthorized", { status: 401 });
  const response = await fetch(
    `${API_URL}/jobs/job-applications/${applicationId}/work-samples/${sampleId}/download/`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!response.ok) return new Response("Could not download work sample", { status: response.status });
  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
      "Content-Disposition": response.headers.get("Content-Disposition") || "attachment",
      "Cache-Control": "private, no-store",
    },
  });
}
