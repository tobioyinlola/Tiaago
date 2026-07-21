import { Flag } from "lucide-react";

import { cn } from "@/app/common/utils";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const riskClassMap: Record<RiskLevel, string> = {
  LOW: "bg-badge-green-bg text-badge-green-text",
  MEDIUM: "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-destructive/10 text-destructive",
};

const riskLabelMap: Record<RiskLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

/** Pill-shaped, colour-coded score + risk label side by side. */
export const IntegrityScoreBadge = ({
  score,
  riskLevel,
}: {
  score: number | null;
  riskLevel: RiskLevel | null;
}) => {
  if (score === null || !riskLevel) {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground whitespace-nowrap">
        Not proctored
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        riskClassMap[riskLevel]
      )}
    >
      {score}/100 &middot; {riskLabelMap[riskLevel]}
    </span>
  );
};

export const RiskLevelBadge = ({ riskLevel }: { riskLevel: RiskLevel }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
      riskClassMap[riskLevel]
    )}
  >
    {riskLabelMap[riskLevel]}
  </span>
);

export const ProctoringViolationFlag = ({ show }: { show: boolean }) =>
  show ? <Flag className="h-3.5 w-3.5 text-destructive" aria-label="Integrity violation flagged" /> : null;

const severityClassMap = {
  INFO: "bg-muted text-muted-foreground",
  WARNING: "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]",
  VIOLATION: "bg-destructive/10 text-destructive",
} as const;

export const ProctoringSeverityBadge = ({ severity }: { severity: "INFO" | "WARNING" | "VIOLATION" }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
      severityClassMap[severity]
    )}
  >
    {severity}
  </span>
);

const plagiarismVerdictClassMap = {
  original: "bg-badge-green-bg text-badge-green-text",
  suspicious: "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]",
  likely_plagiarized: "bg-destructive/10 text-destructive",
} as const;

const plagiarismVerdictLabelMap = {
  original: "Original",
  suspicious: "Suspicious",
  likely_plagiarized: "Likely plagiarized",
} as const;

export const PlagiarismVerdictBadge = ({
  verdict,
}: {
  verdict: "original" | "suspicious" | "likely_plagiarized";
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
      plagiarismVerdictClassMap[verdict]
    )}
  >
    {plagiarismVerdictLabelMap[verdict]}
  </span>
);
