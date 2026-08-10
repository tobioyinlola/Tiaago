import { NextRequest, NextResponse } from "next/server";

import serverKyInstance from "@/app/common/utils/server-ky.instance";
import { getReport } from "@/app/common/services/reports";
import { buildReportPdf, reportPdfFilename } from "@/app/recruiter/dashboard/reports/_lib/buildReportPdf";
import { User } from "@/app/common/types";

// Server-side PDF export: reads report_data (already computed and cached
// by the backend, see reports/services.py), builds the PDF here with
// jsPDF's native drawing API (no headless browser needed -- see
// buildReportPdf.ts for why html2canvas-style screenshotting isn't used),
// persists it to Django (single source of truth for file storage, same as
// every other upload in this app), then streams the same bytes back so the
// browser downloads immediately without a second round trip.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const reportRes = await getReport(id);
  if (!reportRes.success) {
    return NextResponse.json({ error: reportRes.error }, { status: 404 });
  }
  const report = reportRes.data;
  if (report.status !== "READY" || !report.report_data) {
    return NextResponse.json({ error: "Report is not ready yet." }, { status: 400 });
  }

  let recruiterName = "the hiring team";
  try {
    const { user } = await serverKyInstance.get("auth/users/profile").json<{ user: User }>();
    recruiterName = [user.first_name, user.last_name].filter(Boolean).join(" ") || recruiterName;
  } catch {
    // Cosmetic only (cover page "Prepared for" line) -- never blocks the export.
  }

  const pdfBuffer = await buildReportPdf(report, recruiterName);
  const filename = reportPdfFilename(report);

  try {
    const formData = new FormData();
    formData.append("pdf_file", new Blob([pdfBuffer], { type: "application/pdf" }), `${report.id}.pdf`);
    await serverKyInstance.post(`reports/${id}/upload-pdf/`, { body: formData });
  } catch {
    // Caching the PDF is best-effort -- the export itself still succeeds below.
  }

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
