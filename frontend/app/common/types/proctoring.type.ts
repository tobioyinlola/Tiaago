export type ProctoringEventItem = {
  id: string;
  event_type: string;
  event_type_display: string;
  occurred_at: string;
  duration_seconds: number | null;
  metadata: Record<string, unknown>;
  severity: "INFO" | "WARNING" | "VIOLATION";
};

export type ProctoringSettingsSnapshot = {
  proctoring_enabled: boolean;
  require_fullscreen: boolean;
  require_webcam: boolean;
  webcam_snapshots_enabled: boolean;
  snapshot_interval_seconds: number;
  max_tab_switches_before_warning: number;
  max_tab_switches_before_termination: number;
  copy_paste_blocked: boolean;
  right_click_blocked: boolean;
  devtools_detection_enabled: boolean;
  force_submit_on_critical_violation: boolean;
};

export type ProctoringSnapshotItem = {
  id: number;
  image: string;
  created_at: string;
};

export type ProctoringLocation = {
  country?: string;
  region?: string;
  city?: string;
  lat?: number;
  lon?: number;
};

export type PlagiarismFlag = {
  question: string;
  plagiarism_score: number;
  verdict: "original" | "suspicious" | "likely_plagiarized";
  indicators: string[];
  summary: string;
};

export type ProctoringReport = {
  id: string;
  status: "ACTIVE" | "COMPLETED" | "TERMINATED";
  integrity_score: number | null;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  terminated_reason: string | null;
  started_at: string;
  ended_at: string | null;
  settings_snapshot: ProctoringSettingsSnapshot;
  events: ProctoringEventItem[];
  event_counts: { INFO: number; WARNING: number; VIOLATION: number };
  candidate_name: string;
  job_title: string;
  company_name: string | null;
  ip_address: string | null;
  location: ProctoringLocation;
  snapshots: ProctoringSnapshotItem[];
  plagiarism_flags: PlagiarismFlag[];
};

export type AdminProctoringOverview = {
  total_sessions: number;
  average_integrity_score: number | null;
  risk_distribution: { LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number };
  terminated_count: number;
  termination_reasons: { terminated_reason: string; count: number }[];
  most_common_violation: string | null;
};

export type AdminHighRiskSession = {
  id: string;
  assessment_attempt_id: number;
  candidate_name: string;
  organisation: string | null;
  job_title: string;
  integrity_score: number | null;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  top_violations: string[];
  created_at: string;
};
