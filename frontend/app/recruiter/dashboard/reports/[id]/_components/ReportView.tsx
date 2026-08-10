"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Download } from "lucide-react";

import { ID } from "@/app/common/types";
import { ReportDetail } from "@/app/common/types/reports.type";
import ChartContainer from "@/app/common/components/dashboard/charts/ChartContainer";
import { getReport, regenerateReport } from "@/app/common/services/reports";
import { formatDateRange } from "../../_lib/format";
import { triggerPdfExport } from "../../_lib/exportPdf";
import OverviewSection from "./OverviewSection";
import RoleBreakdownSection from "./RoleBreakdownSection";
import PipelinePerformanceSection from "./PipelinePerformanceSection";
import CostAnalysisSection from "./CostAnalysisSection";
import TimeAnalysisSection from "./TimeAnalysisSection";
import CandidateExperienceSection from "./CandidateExperienceSection";

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "roles", label: "Roles" },
  { id: "pipeline", label: "Pipeline" },
  { id: "costs", label: "Costs" },
  { id: "time", label: "Time" },
  { id: "experience", label: "Experience" },
];

const ReportView = ({ reportId, initialReport }: { reportId: ID; initialReport: ReportDetail }) => {
  const [report, setReport] = useState(initialReport);
  const [retrying, setRetrying] = useState(false);
  const isGenerating = report.status === "GENERATING";

  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(async () => {
      const res = await getReport(reportId);
      if (res.success) setReport(res.data);
    }, 3000);
    return () => clearInterval(interval);
  }, [isGenerating, reportId]);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    const res = await regenerateReport(reportId);
    setRetrying(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setReport(res.data);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isGenerating) {
    return (
      <div className='flex flex-col items-center justify-center gap-3 py-24'>
        <Loader2 className='h-10 w-10 animate-spin text-primary' />
        <p className='text-secondary-black text-sm'>Your report is being prepared...</p>
      </div>
    );
  }

  if (report.status === "FAILED") {
    return (
      <div className='flex flex-col items-center justify-center gap-3 py-24 rounded-lg border border-error/30 bg-error/5 max-w-xl mx-auto text-center'>
        <p className='text-sm text-error px-6'>{report.error_message || "Report generation failed."}</p>
        <button type='button' onClick={handleRetry} disabled={retrying} className='btn btn-outline btn-error gap-2'>
          <RefreshCw className={retrying ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Retry
        </button>
      </div>
    );
  }

  const data = report.report_data;
  if (!data) return null;

  return (
    <div className='flex flex-col gap-8'>
      <div className='flex items-start justify-between gap-4 flex-wrap'>
        <div>
          <h1 className='text-2xl font-bold text-[#1A3C5E] font-space-grotesk'>{report.name}</h1>
          <p className='text-sm text-secondary-black mt-1'>
            {formatDateRange(report.date_from, report.date_to)} &middot; {report.job_ids.length}{" "}
            {report.job_ids.length === 1 ? "role" : "roles"}
          </p>
        </div>
        <button
          type='button'
          onClick={() => triggerPdfExport(reportId, report.pdf_url, report.generated_at)}
          className='btn gap-2 rounded-lg text-white'
          style={{ backgroundColor: "#1A3C5E", borderColor: "#1A3C5E" }}
        >
          <Download className='w-4 h-4' /> Export PDF
        </button>
      </div>

      <div className='sticky top-0 z-10 bg-white border-b border-[#EAECF0] -mx-1 px-1'>
        <nav className='flex gap-1 overflow-x-auto py-2'>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              type='button'
              onClick={() => scrollTo(item.id)}
              className='px-3 py-1.5 rounded-lg text-sm font-medium text-secondary-black hover:text-[#1A3C5E] hover:bg-[#F4F4F4] whitespace-nowrap'
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <ChartContainer>
        <OverviewSection data={data} />
        <RoleBreakdownSection roles={data.roles} />
        <PipelinePerformanceSection pipeline={data.pipeline} />
        <CostAnalysisSection costs={data.costs} />
        <TimeAnalysisSection time={data.time} />
        <CandidateExperienceSection experience={data.experience} />
      </ChartContainer>
    </div>
  );
};

export default ReportView;
