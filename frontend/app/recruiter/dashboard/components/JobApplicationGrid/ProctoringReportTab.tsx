"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { ProctoringReport } from "@/app/common/types/proctoring.type";
import ProctoringReportView from "@/app/common/components/dashboard/ProctoringReportView";

const ProctoringReportTab = ({ submissionId }: { submissionId: string | number }) => {
  const [report, setReport] = useState<ProctoringReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await clientKyInstance.get(`proctoring/report/${submissionId}/`).json<ProctoringReport>();
        if (!cancelled) setReport(data);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-secondary-black">Loading proctoring report...</p>
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-sm text-secondary-black">
          No proctoring session was recorded for this assessment attempt.
        </p>
      </div>
    );
  }

  return <ProctoringReportView report={report} />;
};

export default ProctoringReportTab;
