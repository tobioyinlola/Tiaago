// Types mirroring backend/reports/* response shapes exactly (report_data is
// stored as-computed JSON and passed straight through, so field names here
// must match reports/services.py's dict keys 1:1).

import { ID } from "./index";

export type ReportType = "SINGLE_ROLE" | "MULTI_ROLE" | "FULL_ACCOUNT";
export type ReportStatus = "GENERATING" | "READY" | "FAILED";

export type ReportListItem = {
  id: ID;
  name: string;
  report_type: ReportType;
  job_ids: ID[];
  date_from: string;
  date_to: string;
  status: ReportStatus;
  generated_at: string | null;
  created_at: string;
};

export type RoleFunnel = {
  applied: number;
  screened: number;
  assessment_sent: number;
  assessment_completed: number;
  interviewed: number;
  filled: number;
};

export type RoleTime = {
  days_posted_to_first_applicant: number | null;
  avg_hours_application_to_screening: number | null;
  avg_hours_screening_pass_to_assessment_sent: number | null;
  avg_hours_assessment_sent_to_completed: number | null;
  days_open: number;
  days_to_fill: number | null;
  is_filled: boolean;
};

export type RoleCostLine = { count: number; total: number };

export type RoleCost = {
  resume_screening: RoleCostLine;
  assessment: RoleCostLine;
  ai_interview: RoleCostLine;
  human_interview: RoleCostLine;
  recording: RoleCostLine;
  role_total: number;
  cost_per_candidate: number;
  cost_per_placement: number | null;
};

export type CompetencyAverage = { competency_name: string; avg_score: number };

export type RoleReportData = {
  job_id: ID;
  title: string;
  date_posted: string;
  date_filled: string | null;
  status_label: "Filled" | "Active" | "Closed";
  funnel: RoleFunnel;
  time: RoleTime;
  scores: {
    avg_screening_score_all: number | null;
    avg_screening_score_passed: number | null;
    avg_assessment_score: number | null;
    assessment_score_distribution: Record<string, number>;
  };
  cost: RoleCost;
  screening_passed_count: number;
  screening_pass_rate: number;
  assessment_completion_rate: number;
  competency_averages: CompetencyAverage[];
  ai_interview_avg_score: number | null;
  human_interviews_conducted: number;
  ai_interviews_conducted: number;
};

export type ReportSummary = {
  total_roles: number;
  total_applied: number;
  total_screened_passed: number;
  screening_pass_rate: number;
  total_assessments: number;
  avg_cost_per_candidate: number;
  avg_cost_per_role_filled: number | null;
  avg_days_posted_to_filled: number | null;
};

export type ReportPipeline = {
  combined_funnel: RoleFunnel;
  drop_offs: Record<string, number>;
  largest_drop_off_stage: string | null;
  screening_performance: { job_id: ID; title: string; pass_rate: number; avg_score: number | null }[];
  assessment_performance: {
    job_id: ID; title: string; completion_rate: number; avg_score: number | null; avg_hours_to_complete: number | null;
  }[];
  interview_performance: {
    job_id: ID; title: string; human_interviews_conducted: number; ai_interviews_conducted: number;
    competency_averages: CompetencyAverage[]; ai_interview_avg_score: number | null;
  }[];
};

export type ReportCosts = {
  breakdown: Record<"resume_screening" | "assessment" | "ai_interview" | "human_interview" | "recording", number>;
  grand_total: number;
  cost_per_role: { job_id: ID; title: string; total: number }[];
  monthly_trend: { month: string; amount: number }[];
  cost_efficiency: {
    job_id: ID; title: string; candidates: number; cost: number; placements: number; cost_per_placement: number | null;
  }[];
};

export type ReportTimeAnalysis = {
  stage_durations: Record<string, { label: string; avg_hours: number | null }>;
  time_to_fill: { job_id: ID; title: string; days_to_fill: number; beats_benchmark: boolean }[];
  benchmark_days: number;
};

export type ReportExperience = {
  drop_off_analysis: { stage: string; entered: number; left: number; drop_off_rate: number }[];
  assessment_response: { avg_hours_invite_to_completion: number | null; completion_rate: number };
  feedback: { sent_count: number; total_interviewed: number; rate: number; avg_hours_to_send: number | null };
};

export type ReportData = {
  generated_at: string;
  date_from: string;
  date_to: string;
  organisation: { name: string };
  roles: RoleReportData[];
  summary: ReportSummary;
  pipeline: ReportPipeline;
  costs: ReportCosts;
  time: ReportTimeAnalysis;
  experience: ReportExperience;
};

export type ReportDetail = {
  id: ID;
  name: string;
  report_type: ReportType;
  job_ids: ID[];
  date_from: string;
  date_to: string;
  status: ReportStatus;
  report_data: ReportData | null;
  pdf_url: string | null;
  generated_at: string | null;
  error_message: string;
  created_at: string;
};
