import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getCurrentUser } from "@/app/common/services/profile";
import { getRevenueSummary } from "@/app/common/services/revenue";
import { handleServerApiCallError, cn } from "@/app/common/utils";
import ServerPagination from "@/app/common/components/ServerPagination";
import StatCard from "@/app/common/components/dashboard/StatCard";
import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import ChartContainer from "@/app/common/components/dashboard/charts/ChartContainer";
import DashboardBarChart from "@/app/common/components/dashboard/charts/DashboardBarChart";
import DashboardDonutChart from "@/app/common/components/dashboard/charts/DashboardDonutChart";

export const metadata = {
  title: "Revenue and Billing",
};

const RevenuePage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const { currentUser } = await getCurrentUser("staff");
  const canView = currentUser.is_super_admin || currentUser.permissions.includes("revenue.view");
  if (!canView) {
    redirect("/admin/unauthorised?permission=revenue.view");
  }

  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const days = resolvedSearchParams.days === "90" ? 90 : 30;
  const _page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page as string, 10) : 1;
  const page = Number.isNaN(_page) ? 1 : _page;

  const revenue = await getRevenueSummary({ days, page }).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get revenue summary error (admin revenue): ", error);
    errors.push({ title: "Error getting revenue summary", message: error });
    return null;
  });

  if (!revenue) {
    return <DisplayErrorMessages errors={errors} />;
  }

  const dayLabels = revenue.daily_revenue.map(d =>
    new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  );

  const topupColumns: DataTableColumn<(typeof revenue.wallet_topup_events.results)[number]>[] = [
    { key: "company_name", header: "Organisation", render: r => r.company_name, className: "text-left" },
    { key: "amount", header: "Amount", render: r => `₦${r.amount_ngn.toLocaleString()}` },
    { key: "date", header: "Date", render: r => format(new Date(r.date), "MMM dd, yyyy hh:mm a") },
    { key: "running_total", header: "Running total", render: r => `₦${r.running_total_ngn.toLocaleString()}` },
  ];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-border pb-1 mb-6'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Revenue and Billing</h1>
        <h4 className='text-foreground text-sm md:text-base'>
          Wallet-funded revenue across the platform — no candidate data here.
        </h4>
      </div>

      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
        <StatCard label='Avg deposit amount' value={`₦${revenue.avg_deposit_amount_ngn.toLocaleString()}`} />
        <StatCard label='Orgs on free credits' value={revenue.orgs_on_free_credits} />
        <StatCard label='Orgs on paid wallet' value={revenue.orgs_on_paid_wallet} />
        <StatCard
          label='Current PAYG prices'
          value={`₦${revenue.current_prices_ngn.resume_screening} / ₦${revenue.current_prices_ngn.assessment}`}
          subText='Resume screening / Assessment'
        />
      </div>

      <ChartContainer>
        <section className='grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8'>
          <div className='lg:col-span-2 rounded-lg border bg-card p-6 shadow-sm'>
            <div className='flex items-center justify-between mb-4'>
              <h4 className='text-gray-900 text-base font-medium'>Revenue by day</h4>
              <div className='flex gap-1 text-xs'>
                <Link
                  href={{ query: { ...resolvedSearchParams, days: 30 } }}
                  className={cn("btn btn-xs", days === 30 ? "btn-primary text-white" : "btn-ghost")}
                >
                  30d
                </Link>
                <Link
                  href={{ query: { ...resolvedSearchParams, days: 90 } }}
                  className={cn("btn btn-xs", days === 90 ? "btn-primary text-white" : "btn-ghost")}
                >
                  90d
                </Link>
              </div>
            </div>
            <DashboardBarChart labels={dayLabels} data={revenue.daily_revenue.map(d => d.amount)} />
          </div>
          <div className='rounded-lg border bg-card p-6 shadow-sm'>
            <h4 className='text-gray-900 text-base font-medium mb-4'>Resume screening vs Assessment</h4>
            <DashboardDonutChart
              labels={["Resume screening", "Assessment"]}
              data={[revenue.by_service_type.resume_screening, revenue.by_service_type.assessment]}
            />
          </div>
        </section>
      </ChartContainer>

      <section className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
        <div className='rounded-lg border bg-card p-6 shadow-sm'>
          <h4 className='text-gray-900 text-base font-medium mb-4'>Top 10 organisations by spend this month</h4>
          {revenue.top_10_orgs_by_spend_this_month.length ? (
            <ol className='space-y-3'>
              {revenue.top_10_orgs_by_spend_this_month.map((org, i) => (
                <li key={org.company_id} className='flex items-center justify-between text-sm'>
                  <span className='flex items-center gap-2'>
                    <span className='text-muted-foreground w-5'>{i + 1}.</span>
                    {org.company_name}
                  </span>
                  <span className='font-medium'>
                    ₦{org.spend_ngn.toLocaleString()}{" "}
                    <span className='text-muted-foreground text-xs'>({org.pct_of_total_revenue}%)</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className='text-sm text-muted-foreground py-8 text-center'>No spend recorded this month yet.</p>
          )}
        </div>

        <div className='rounded-lg border bg-card p-6 shadow-sm'>
          <h4 className='text-gray-900 text-base font-medium mb-4'>Gross margin per action</h4>
          {revenue.margin.available ? (
            <div className='grid grid-cols-2 gap-4'>
              <StatCard label='Resume screening margin' value={`${revenue.margin.resume_screening_margin_pct}%`} />
              <StatCard label='Assessment margin' value={`${revenue.margin.assessment_margin_pct}%`} />
            </div>
          ) : (
            <p className='text-sm text-muted-foreground py-8 text-center'>
              Not available yet — needs real per-call OpenAI cost data from the AI service, which isn&apos;t tracked yet.
            </p>
          )}
        </div>
      </section>

      <h3 className='text-gray-900 text-lg font-medium mb-4'>Wallet top-up events</h3>
      <DataTable
        columns={topupColumns}
        data={revenue.wallet_topup_events.results}
        rowKey={r => `${r.company_name}-${r.date}-${r.amount_ngn}`}
        emptyText='No wallet top-ups yet'
      />
      <ServerPagination pagedResource={revenue.wallet_topup_events} searchParams={resolvedSearchParams} />
    </>
  );
};

export default RevenuePage;
