export const SAMPLE_MERGE_DATA: Record<string, string> = {
  first_name: "Ada",
  org_name: "Acme Recruiting",
  wallet_balance: "12,500",
  resumes_screened_total: "342",
  resumes_screened_month: "48",
  assessments_total: "27",
  active_jobs: "5",
  pipeline_count: "63",
  account_age_days: "128",
  unsubscribe_url: "#unsubscribe",
};

export const substituteMergeTagsWithSampleData = (html: string) =>
  html.replace(/{{\s*([a-z_]+)\s*}}/gi, (match, tag) => SAMPLE_MERGE_DATA[tag] ?? match);
