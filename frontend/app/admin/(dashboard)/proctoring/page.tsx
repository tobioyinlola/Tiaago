import Link from "next/link";
import { redirect } from "next/navigation";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getCurrentUser } from "@/app/common/services/profile";
import { getAdminProctoringOverview, getAdminHighRiskSessions } from "@/app/common/services/proctoring";
import { handleServerApiCallError } from "@/app/common/utils";
import StatCard from "@/app/common/components/dashboard/StatCard";
import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import ChartContainer from "@/app/common/components/dashboard/charts/ChartContainer";
import DashboardBarChart from "@/app/common/components/dashboard/charts/DashboardBarChart";
import { RiskLevelBadge } from "@/app/common/components/dashboard/ProctoringBadges";
import { AdminHighRiskSession } from "@/app/common/types/proctoring.type";

export const metadata = {
  title: "Proctoring",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  TAB_HIDDEN: "Tab hidden",
  COPY_DETECTED: "Copy detected",
  PASTE_DETECTED: "Paste detected",
  DEVTOOLS_DETECTED: "Developer tools detected",
  FULLSCREEN_EXITED: "Fullscreen exited",
  SCREENSHOT_ATTEMPT: "Screenshot attempt",
};

const AdminProctoringPage = async () => {
  const { currentUser } = await getCurrentUser("staff");
  const canView = currentUser.is_super_admin || currentUser.permissions.includes("proctoring.admin");
  if (!canView) {
    redirect("/admin/unauthorised?permission=proctoring.admin");
  }

  const errors: DisplayErrorMessagesProps["errors"] = [];

  const overview = await getAdminProctoringOverview().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get proctoring overview error (admin proctoring): ", error);
    errors.push({ title: "Error getting proctoring overview", message: error });
    return null;
  });

  const sessionsRes = await getAdminHighRiskSessions().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get high-risk sessions error (admin proctoring): ", error);
    errors.push({ title: "Error getting high-risk sessions", message: error });
    return null;
  });

  const sessions = sessionsRes?.results ?? [];

  const columns: DataTableColumn<AdminHighRiskSession>[] = [
    {
      key: "candidate_name",
      header: "Candidate",
      render: r => (
        <Link href={`/admin/proctoring/${r.assessment_attempt_id}`} className='text-primary hover:underline'>
          {r.candidate_name}
        </Link>
      ),
      className: "text-left",
    },
    { key: "organisation", header: "Organisation", render: r => r.organisation ?? "—", className: "text-left" },
    { key: "job_title", header: "Job", render: r => r.job_title, className: "text-left" },
    { key: "integrity_score", header: "Score", render: r => (r.integrity_score != null ? `${r.integrity_score}/100` : "—") },
    { key: "risk_level", header: "Risk", render: r => (r.risk_level ? <RiskLevelBadge riskLevel={r.risk_level} /> : "—") },
    {
      key: "top_violations",
      header: "Top violations",
      render: r => r.top_violations.map(t => EVENT_TYPE_LABELS[t] ?? t).join(", ") || "—",
      className: "text-left",
    },
    { key: "created_at", header: "Date", render: r => new Date(r.created_at).toLocaleDateString() },
  ];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-border pb-1 mb-6'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Proctoring</h1>
        <h4 className='text-foreground text-sm md:text-base'>
          Integrity signals across every proctored assessment this month.
        </h4>
      </div>

      {overview && (
        <>
          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
            <StatCard label='Proctored assessments this month' value={overview.total_sessions} />
            <StatCard
              label='Average integrity score'
              value={overview.average_integrity_score != null ? `${overview.average_integrity_score}/100` : null}
            />
            <StatCard label='Terminated sessions this month' value={overview.terminated_count} />
            <StatCard
              label='Most common violation'
              value={
                overview.most_common_violation
                  ? EVENT_TYPE_LABELS[overview.most_common_violation] ?? overview.most_common_violation
                  : null
              }
            />
          </div>

          <ChartContainer>
            <section className='rounded-lg border bg-card p-6 shadow-sm mb-8'>
              <h4 className='text-gray-900 text-base font-medium mb-4'>Risk level distribution</h4>
              <DashboardBarChart
                labels={["Low", "Medium", "High", "Critical"]}
                data={[
                  overview.risk_distribution.LOW,
                  overview.risk_distribution.MEDIUM,
                  overview.risk_distribution.HIGH,
                  overview.risk_distribution.CRITICAL,
                ]}
              />
            </section>
          </ChartContainer>

          {!!overview.termination_reasons.length && (
            <section className='mb-8 rounded-lg border bg-card p-6 shadow-sm'>
              <h4 className='text-gray-900 text-base font-medium mb-4'>Termination reasons this month</h4>
              <ul className='flex flex-col gap-2'>
                {overview.termination_reasons.map(r => (
                  <li key={r.terminated_reason} className='flex items-center justify-between text-sm'>
                    <span className='text-secondary-black'>{r.terminated_reason}</span>
                    <span className='font-medium text-primary-black'>{r.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <section>
        <h3 className='text-gray-900 text-lg font-medium mb-4'>High-risk sessions</h3>
        <DataTable columns={columns} data={sessions} rowKey={r => r.id} emptyText='No high-risk sessions' />
      </section>
    </>
  );
};

export default AdminProctoringPage;
