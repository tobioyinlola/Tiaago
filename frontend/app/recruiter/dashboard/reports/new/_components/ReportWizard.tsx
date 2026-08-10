"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";

import { Job, ID } from "@/app/common/types";
import { ReportType } from "@/app/common/types/reports.type";
import { generateReport } from "@/app/common/services/reports";
import { Button } from "@/app/common/components/ui/button";
import StepIndicator from "@/app/recruiter/dashboard/jobs/create/CreateJobForm/_components/StepIndicator";
import { Preset } from "../../_components/DateRangePicker";
import ReportTypeStep from "./ReportTypeStep";
import RoleSelectionStep from "./RoleSelectionStep";
import GenerateStep from "./GenerateStep";

const ninetyDaysAgo = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 90);
  return d;
};

const ReportWizard = ({ jobs }: { jobs: Job[] }) => {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | null>(ninetyDaysAgo());
  const [dateTo, setDateTo] = useState<Date | null>(new Date());
  const [preset, setPreset] = useState<Preset>("90d");
  const [selectedJobIds, setSelectedJobIds] = useState<ID[]>([]);
  const [name, setName] = useState("");
  const [generating, setGenerating] = useState(false);

  // FULL_ACCOUNT skips role selection, so it only ever has 2 steps (type+dates,
  // generate) instead of 3 -- `step` is a single consistent counter matching
  // whichever of those two step counts is active, no separate "logical step".
  const needsRoleSelection = reportType === "SINGLE_ROLE" || reportType === "MULTI_ROLE";
  const totalSteps = needsRoleSelection ? 3 : 2;
  const isRoleStep = needsRoleSelection && step === 1;
  const isGenerateStep = step === totalSteps - 1;

  const stepMeta = isGenerateStep
    ? { title: "Generate", description: "Review and generate your report." }
    : isRoleStep
      ? { title: "Select roles", description: "Pick which roles to include." }
      : { title: "Report type & date range", description: "Choose what this report covers." };

  const selectedJobs = jobs.filter(j => selectedJobIds.includes(j.id));

  const canProceedFromTypeStep = !!reportType && !!dateFrom && !!dateTo;
  const canProceedFromRoleStep = selectedJobIds.length > 0;

  const handleNext = () => {
    if (step === 0 && !canProceedFromTypeStep) {
      toast.error("Choose a report type and date range first.");
      return;
    }
    if (isRoleStep && !canProceedFromRoleStep) {
      toast.error("Select at least one role.");
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => setStep(prev => Math.max(0, prev - 1));

  const handleGenerate = async () => {
    if (!reportType || !dateFrom || !dateTo || generating) return;
    setGenerating(true);
    const res = await generateReport({
      name: name.trim() || `${reportType === "FULL_ACCOUNT" ? "Full account" : selectedJobs.map(j => j.title).join(", ")} report`,
      report_type: reportType,
      job_ids: needsRoleSelection ? selectedJobIds : [],
      date_from: dateFrom.toISOString().slice(0, 10),
      date_to: dateTo.toISOString().slice(0, 10),
    });
    if (!res.success) {
      setGenerating(false);
      toast.error(res.error);
      return;
    }
    router.push(`/recruiter/dashboard/reports/${res.data.reportId}`);
  };

  return (
    <div className='bg-white rounded-2lg p-6 border border-[#EAECF0] flex flex-col gap-6 max-w-3xl'>
      <StepIndicator step={step} totalSteps={totalSteps} title={stepMeta.title} description={stepMeta.description} />

      {step === 0 && (
        <ReportTypeStep
          reportType={reportType}
          onReportTypeChange={setReportType}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateChange={(from, to) => {
            setDateFrom(from);
            setDateTo(to);
          }}
          preset={preset}
          onPresetChange={setPreset}
        />
      )}

      {isRoleStep && reportType && (
        <RoleSelectionStep
          jobs={jobs}
          reportType={reportType}
          selectedJobIds={selectedJobIds}
          onSelectionChange={setSelectedJobIds}
        />
      )}

      {isGenerateStep && dateFrom && dateTo && (
        <GenerateStep
          name={name}
          onNameChange={setName}
          dateFrom={dateFrom}
          dateTo={dateTo}
          selectedJobs={selectedJobs}
          generating={generating}
        />
      )}

      {!generating && (
        <div className='flex items-center justify-between w-full pt-4 border-t border-[#EAECF0]'>
          <Button onClick={handleBack} disabled={step === 0} variant='outline' type='button'>
            <ArrowLeft className='h-4 w-4 mr-2' /> Previous
          </Button>
          {isGenerateStep ? (
            <Button onClick={handleGenerate} type='button'>
              Generate Report <Send className='h-4 w-4 ml-2' />
            </Button>
          ) : (
            <Button onClick={handleNext} type='button'>
              Continue <ArrowRight className='h-4 w-4 ml-2' />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportWizard;
