import serverKyInstance from "../utils/server-ky.instance";

export type InterviewAnalyticsSummary = {
  total_interviews: number;
  completed_interviews: number;
  status_breakdown: { status: string; count: number }[];
  recommendation_breakdown: { recommendation: string; count: number }[];
  top_organisations: { company_name: string; interview_count: number }[];
  ai_copilot: {
    calls_this_month: number;
    use_rate_pct: number | null;
    interviews_with_copilot_this_month: number;
  };
  revenue_this_month_ngn: {
    interview_packages: number;
    recording_addons: number;
    total: number;
  };
  openai_cost_this_month: { available: boolean };
  recent_interviews: {
    id: string;
    meeting_date: string | null;
    status: string;
    company_name: string;
    candidate_name: string;
  }[];
};

export const getInterviewAnalyticsSummary = async (): Promise<InterviewAnalyticsSummary> => {
  const data = await serverKyInstance.get("analytics/interviews/").json<InterviewAnalyticsSummary>();
  return data;
};
