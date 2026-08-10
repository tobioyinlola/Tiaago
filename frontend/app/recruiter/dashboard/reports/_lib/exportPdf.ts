import { ID } from "@/app/common/types";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/** Navigates the browser to either the cached PDF (if still fresh) or the
 * export route (which builds one, caches it, and streams it back) --
 * Content-Disposition: attachment on both response types is what actually
 * triggers the download, not this navigation itself. */
export const triggerPdfExport = (reportId: ID, pdfUrl: string | null, generatedAt: string | null) => {
  const isFresh = !!pdfUrl && !!generatedAt && Date.now() - new Date(generatedAt).getTime() < TWENTY_FOUR_HOURS_MS;
  window.location.href = isFresh ? pdfUrl! : `/api/reports/${reportId}/export-pdf`;
};
