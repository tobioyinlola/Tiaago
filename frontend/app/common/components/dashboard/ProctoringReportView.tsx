"use client";

import { useState } from "react";
import { AlertTriangle, Camera, MapPin, ShieldAlert, X } from "lucide-react";

import { ProctoringReport } from "@/app/common/types/proctoring.type";
import {
  IntegrityScoreBadge,
  PlagiarismVerdictBadge,
  ProctoringSeverityBadge,
} from "@/app/common/components/dashboard/ProctoringBadges";

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

const locationLabel = (location: ProctoringReport["location"]) => {
  const parts = [location.city, location.region, location.country].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
};

/** Pure presentational proctoring report -- reused by the recruiter's
 * applicant-modal tab (client-fetched) and the admin session detail page
 * (server-fetched), so the visual report only exists in one place. */
const ProctoringReportView = ({ report }: { report: ProctoringReport }) => {
  const [expandedSnapshot, setExpandedSnapshot] = useState<string | null>(null);
  const resolvedLocation = locationLabel(report.location);

  return (
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

      <div className="flex items-center gap-4 text-xs text-secondary-black flex-wrap">
        <span>{report.event_counts.INFO} INFO</span>
        <span>{report.event_counts.WARNING} WARNINGS</span>
        <span>{report.event_counts.VIOLATION} VIOLATIONS</span>
        {(report.ip_address || resolvedLocation) && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {report.ip_address}
            {resolvedLocation ? ` · ${resolvedLocation}` : ""}
          </span>
        )}
      </div>
    </div>

    {/* Webcam snapshots */}
    {report.snapshots.length > 0 && (
      <div className="rounded-xl border border-[#EAECEE] bg-white p-6">
        <h4 className="text-sm font-semibold text-primary-black mb-4 flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Webcam snapshots ({report.snapshots.length})
        </h4>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {report.snapshots.map(snapshot => (
            <button
              key={snapshot.id}
              type="button"
              onClick={() => setExpandedSnapshot(snapshot.image)}
              className="group relative aspect-square rounded-lg overflow-hidden border border-[#EAECEE] focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- external/private-storage URLs, not optimizable via next/image */}
              <img
                src={snapshot.image}
                alt="Webcam capture during assessment"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5">
                {elapsed(report.started_at, snapshot.created_at)}
              </span>
            </button>
          ))}
        </div>
      </div>
    )}

    {expandedSnapshot && (
      <div
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
        onClick={() => setExpandedSnapshot(null)}
      >
        <button
          type="button"
          className="absolute top-6 right-6 text-white"
          onClick={() => setExpandedSnapshot(null)}
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={expandedSnapshot}
          alt="Webcam capture, enlarged"
          className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
          onClick={e => e.stopPropagation()}
        />
      </div>
    )}

    {/* AI plagiarism check */}
    {report.plagiarism_flags.length > 0 && (
      <div className="rounded-xl border border-[#EAECEE] bg-white p-6">
        <h4 className="text-sm font-semibold text-primary-black mb-4 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          AI plagiarism check
        </h4>
        <div className="flex flex-col gap-4">
          {report.plagiarism_flags.map((flag, i) => (
            <div key={i} className="rounded-lg border border-[#EAECEE] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-primary-black">{flag.question}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary-black">{Math.round(flag.plagiarism_score)}/100</span>
                  <PlagiarismVerdictBadge verdict={flag.verdict} />
                </div>
              </div>
              {flag.summary && <p className="text-sm text-secondary-black mb-2">{flag.summary}</p>}
              {flag.indicators.length > 0 && (
                <ul className="list-disc list-inside text-xs text-secondary-black space-y-0.5">
                  {flag.indicators.map((indicator, j) => (
                    <li key={j}>{indicator}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-secondary-black italic mt-3">
          AI-generated signal, not proof -- review the candidate&apos;s code directly before drawing conclusions.
        </p>
      </div>
    )}

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
};

export default ProctoringReportView;
