// Types mirroring the /api/analytics/* endpoint response shapes.

import { PagedResource } from "./index";

export type DailyPoint = { date: string; amount: number };
export type DailyCountPoint = { date: string; count: number };

export type OverviewMetrics = {
  morning_digest: {
    active_organisations_today: number;
    resumes_screened_last_24h: number;
    wallet_topups_last_24h_ngn: number;
  };
  organisations: {
    total: number;
    active_30d: number;
    new_this_week: number;
    new_last_week: number;
    churned: number;
  };
  resumes_screened: { today: number; week: number; month: number };
  assessments_taken: { today: number; week: number; month: number };
  revenue: {
    this_month_ngn: number;
    last_month_ngn: number;
    mom_growth_pct: number | null;
  };
  active_jobs: number;
  total_candidates: number;
  daily_revenue_30d: DailyPoint[];
  daily_active_organisations_30d: DailyCountPoint[];
};

export type OrganisationStatus = "active" | "dormant" | "churned" | "free_credits";

export type OrganisationRow = {
  id: number;
  company_name: string;
  date_joined: string;
  status: OrganisationStatus;
  wallet_balance_ngn: number;
  wallet_low: boolean;
  total_resumes_screened: number;
  total_assessments_taken: number;
  active_jobs_count: number;
  team_members_count: number;
  last_active: string | null;
  last_login: string | null;
  total_spend_ngn: number;
  monthly_avg_spend_ngn: number;
  tags: { slug: string; name: string; colour: string }[];
};

export type OrganisationTimelineEvent =
  | { type: "resume_screened"; date: string; score: number | null }
  | { type: "assessment_created"; date: string }
  | { type: "billing"; date: string; transaction_type: string; service_type: string | null; amount: number };

export type OrganisationDetail = OrganisationRow & {
  timeline: OrganisationTimelineEvent[];
};

export type PagedResult<T> = PagedResource<T>;

export type OrganisationAlerts = {
  low_wallet_balance: { id: number; company_name: string; wallet_balance_ngn: number }[];
  no_login_14d_plus: { id: number; company_name: string }[];
  never_screened_after_7d: { id: number; company_name: string; date_joined: string }[];
  team_exists_but_one_login: { id: number; company_name: string; team_size: number }[];
};

export type RevenueSummary = {
  daily_revenue: DailyPoint[];
  by_service_type: { resume_screening: number; assessment: number };
  top_10_orgs_by_spend_this_month: {
    company_id: number;
    company_name: string;
    spend_ngn: number;
    pct_of_total_revenue: number;
  }[];
  avg_deposit_amount_ngn: number;
  orgs_on_free_credits: number;
  orgs_on_paid_wallet: number;
  margin: {
    available: boolean;
    resume_screening_margin_pct: number | null;
    assessment_margin_pct: number | null;
  };
  current_prices_ngn: { resume_screening: number; assessment: number };
  wallet_topup_events: PagedResult<{
    company_name: string;
    amount_ngn: number;
    date: string;
    running_total_ngn: number;
  }>;
};

export type FunnelStage = { stage: string; count: number; conversion_from_previous_pct: number };

export type FunnelSummary = {
  funnel: FunnelStage[];
  avg_screening_pass_mark: number | null;
  avg_assessment_pass_mark: number | null;
  assessment_dropout_rate_pct: number;
  candidate_ghost_rate_pct: number;
  avg_time_to_complete_after_invite: { minutes: number | null; available: boolean };
  assessment_type_breakdown: Record<string, number>;
  avg_score: number | null;
  score_distribution: {
    below_30: number;
    "30_to_50": number;
    "50_to_70": number;
    "70_to_90": number;
    above_90: number;
  };
};

export type PipelineSummary = {
  total_pipeline_candidates: number;
  outreach_messages_this_month: number;
  source_split: { added_via_invite_link: number; added_directly_by_team: number };
  avg_pipeline_size_per_active_org: number;
  orgs_with_zero_pipeline_entries: { id: number; company_name: string; date_joined: string; active_jobs: number }[];
  pipeline_growth_90d: DailyCountPoint[];
};

export type GrowthSummary = {
  signup_source: {
    utm: Record<string, number>;
    heard_from: Record<string, number>;
  };
  referral_table: { referring_org: string; referred_org: string; date: string; conversion_status: string }[];
  top_5_referring_organisations: { id: number; company_name: string; referral_count: number }[];
  activation_funnel: {
    step: string;
    median_hours: number | null;
    pct_completed: number;
    pct_dropped_off: number;
  }[];
  cohort_retention_table: {
    cohort: string;
    cohort_size: number;
    months: { offset: number; pct_active: number }[];
  }[];
};

export type RetakeComparison = {
  job_application_id: number;
  original_score: number;
  retake_score: number;
  attempts: number;
};

export type JobAssessmentStat = {
  job_id: number;
  job_title: string;
  failure_rate_pct: number;
  avg_score: number | null;
  total_submissions: number;
};

export type AssessmentIntelligenceSummary = {
  assessments_created_this_month: number;
  assessments_completed_this_month: number;
  platform_avg_score: number | null;
  flag_events: { available: boolean; reason: string };
  flag_rate_pct: { available: boolean };
  retake_comparisons: RetakeComparison[];
  completion_time_distribution: {
    available: boolean;
    buckets: { under_15min: number; "15_to_30min": number; "30_to_60min": number; over_60min: number };
  };
  top_10_jobs_by_failure_rate: JobAssessmentStat[];
  top_10_jobs_by_avg_score: JobAssessmentStat[];
};

export type FailedJobEvent = {
  company_name: string | null;
  job_application_id: number | null;
  error: string | null;
  date: string;
};

export type SystemHealthSummary = {
  openai_call_volume: { today: number; week: number; month: number };
  api_error_rate_pct: number | null;
  failed_screening_jobs_24h: FailedJobEvent[];
  failed_assessment_jobs_24h: FailedJobEvent[];
  email_delivery_rate_pct: { available: boolean; value: number | null };
  avg_response_time_ms: { resume_screening: number | null; assessment_generation: number | null; available: boolean };
  infra_cost: { ngn: number | null; usd: number | null; available: boolean };
  gross_margin_this_month: { available: boolean };
  platform_uptime_30d_pct: { available: boolean };
};
