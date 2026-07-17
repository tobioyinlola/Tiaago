import { AlertTriangle } from "lucide-react";

import { ProctoringReport } from "@/app/common/types/proctoring.type";
import { IntegrityScoreBadge, ProctoringSeverityBadge } from "@/app/common/components/dashboard/ProctoringBadges";

const SETTINGS_LABELS: { key: keyof ProctoringReport["settings_snapshot"]; label: string }[] = [
  { key: "require_fullscreen", label: "Fullscreen required" },
  { key: "require_webcam", label: "Webcam required" },
  { key: "webcam_snapshots_enabled", label: "Webcam snapshots" },
  { key: "copy_paste_blocked", label: "Copy/paste blocked" },
  { key: "right_click_blocked", label: "Right-click blocked" },
  { key: "devtools_detection_enabled", label: "Developer tools detection" },
  { key: "force_submit_on_critical_violation", label: "Auto-submit on critical violation" },
];

const elapsed = (startedAt: string, occurredAt: string) => {
  const seconds = Math.max(0, Math.round((new Date(occurredAt).getTime() - new Date(startedAt).getTime()) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

/** Pure presentational proctoring report -- reused by the recruiter's
 * applicant-modal tab (client-fetched) and the admin session detail page
 * (server-fetched), so the visual report only exists in one place. */
const ProctoringReportView = ({ report }: { report: ProctoringReport }) => (
  <div className="p-6 flex flex-col gap-6">
    {/* Summary card */}
    <div className="rounded-xl border border-[#EAECEE] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary-black mb-1">Integrity score</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold text-primary-black">{report.integrity_score ?? "--"}</span>
            {report.risk_level && <IntegrityScoreBadge score={report.integrity_score} riskLevel={report.risk_level} />}
          </div>
        </div>
        <div className="text-right text-sm text-secondary-black">
          <p>
            Status: <span className="font-medium text-primary-black">{report.status}</span>
          </p>
          <p>
            Duration:{" "}
            <span className="font-medium text-primary-black">
              {report.ended_at ? elapsed(report.started_at, report.ended_at) : "In progress"}
            </span>
          </p>
        </div>
      </div>

      {report.status === "TERMINATED" && report.terminated_reason && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 mb-4">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{report.terminated_reason}</p>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-secondary-black">
        <span>{report.event_counts.INFO} INFO</span>
        <span>{report.event_counts.WARNING} WARNINGS</span>
        <span>{report.event_counts.VIOLATION} VIOLATIONS</span>
      </div>
    </div>

    {/* Settings used */}
    <div className="rounded-xl border border-[#EAECEE] bg-white p-6">
      <h4 className="text-sm font-semibold text-primary-black mb-4">Proctoring settings used</h4>
      <div className="grid sm:grid-cols-2 gap-3">
        {SETTINGS_LABELS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-secondary-black">{label}</span>
            <span className={report.settings_snapshot[key] ? "text-success font-medium" : "text-secondary-black"}>
              {typeof report.settings_snapshot[key] === "boolean"
                ? report.settings_snapshot[key]
                  ? "On"
                  : "Off"
                : String(report.settings_snapshot[key])}
            </span>
          </div>
        ))}
      </div>
    </div>

    {/* Event timeline */}
    <div className="rounded-xl border border-[#EAECEE] bg-white overflow-hidden">
      <h4 className="text-sm font-semibold text-primary-black p-6 pb-0 mb-4">Event timeline</h4>
      {report.events.length ? (
        <div>
          {report.events.map((event, i) => (
            <div
              key={event.id}
              className={`flex items-center gap-4 px-6 py-3 text-sm ${i % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}`}
            >
              <ProctoringSeverityBadge severity={event.severity} />
              <span className="font-mono text-xs text-secondary-black w-16 shrink-0">
                {elapsed(report.started_at, event.occurred_at)}
              </span>
              <span className="text-primary-black flex-1">{event.event_type_display}</span>
              {event.duration_seconds != null && (
                <span className="text-xs text-secondary-black">{event.duration_seconds}s</span>
              )}
              {!!event.metadata && "question_number" in event.metadata && (
                <span className="text-xs text-secondary-black">Q{String(event.metadata.question_number)}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-secondary-black px-6 pb-6">No events recorded.</p>
      )}
    </div>

    <p className="text-xs text-secondary-black italic">
      This proctoring report is generated to assist your review. It does not constitute proof of dishonesty. Tiaago
      recommends reviewing these signals alongside the candidate&apos;s answers before making any hiring decision.
    </p>
  </div>
);

export default ProctoringReportView;
