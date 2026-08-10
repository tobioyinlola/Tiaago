"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Eye, Trash2 } from "lucide-react";

import { deleteReport } from "@/app/common/services/reports";
import { ReportListItem } from "@/app/common/types/reports.type";
import { formatDateRange } from "../_lib/format";
import { triggerPdfExport } from "../_lib/exportPdf";
import ReportStatusBadge from "./ReportStatusBadge";

const REPORT_TYPE_LABELS: Record<ReportListItem["report_type"], string> = {
  SINGLE_ROLE: "Single role",
  MULTI_ROLE: "Multiple roles",
  FULL_ACCOUNT: "Full account",
};

const ReportCard = ({ report }: { report: ReportListItem }) => {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;
    if (!window.confirm(`Delete "${report.name}"? This can't be undone.`)) return;
    setDeleting(true);
    const res = await deleteReport(report.id);
    setDeleting(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Report deleted");
    router.refresh();
  };

  const handleExport = () => {
    if (report.status !== "READY") return;
    triggerPdfExport(report.id, null, report.generated_at);
  };

  return (
    <div className='border border-[#EAECF0] rounded-2lg p-6 flex flex-col gap-4 hover:shadow-card-hover hover:border-primary/30 transition-shadow'>
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <h3 className='font-medium text-primaryBlack truncate'>{report.name}</h3>
          <p className='text-secondary-black text-xs mt-0.5'>{REPORT_TYPE_LABELS[report.report_type]}</p>
        </div>
        <ReportStatusBadge status={report.status} />
      </div>

      <div className='text-sm text-secondary-black space-y-1'>
        <p>{formatDateRange(report.date_from, report.date_to)}</p>
        <p>
          {report.job_ids.length} {report.job_ids.length === 1 ? "role" : "roles"}
        </p>
        {report.generated_at && <p>Generated {new Date(report.generated_at).toLocaleDateString()}</p>}
      </div>

      <div className='flex items-center gap-2 pt-2 border-t border-[#F5F5F5]'>
        <Link
          href={`/recruiter/dashboard/reports/${report.id}`}
          className='btn btn-sm btn-outline gap-1.5 flex-1'
        >
          <Eye className='w-3.5 h-3.5' /> View
        </Link>
        <button
          type='button'
          onClick={handleExport}
          disabled={report.status !== "READY"}
          className='btn btn-sm btn-outline gap-1.5 flex-1 disabled:opacity-40'
        >
          <Download className='w-3.5 h-3.5' /> Export
        </button>
        <button
          type='button'
          onClick={handleDelete}
          disabled={deleting}
          aria-label={`Delete ${report.name}`}
          className='btn btn-sm btn-outline btn-error gap-1.5'
        >
          <Trash2 className='w-3.5 h-3.5' />
        </button>
      </div>
    </div>
  );
};

export default ReportCard;
