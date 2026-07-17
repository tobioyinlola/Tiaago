import { format } from "date-fns";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getGrowthSummary } from "@/app/common/services/growth";
import { handleServerApiCallError } from "@/app/common/utils";
import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import ChartContainer from "@/app/common/components/dashboard/charts/ChartContainer";
import DashboardDonutChart from "@/app/common/components/dashboard/charts/DashboardDonutChart";
import CohortRetentionTable from "@/app/common/components/dashboard/CohortRetentionTable";

export const metadata = {
  title: "Acquisition and Growth",
};

const GrowthPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const growth = await getGrowthSummary().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get growth summary error (admin growth): ", error);
    errors.push({ title: "Error getting growth data", message: error });
    return null;
  });

  if (!growth) {
    return <DisplayErrorMessages errors={errors} />;
  }

  type ReferralRow = (typeof growth.referral_table)[number];
  const referralColumns: DataTableColumn<ReferralRow>[] = [
    { key: "referring_org", header: "Referring org", render: r => r.referring_org, className: "text-left" },
    { key: "referred_org", header: "Referred org", render: r => r.referred_org, className: "text-left" },
    { key: "date", header: "Date", render: r => format(new Date(r.date), "MMM dd, yyyy") },
    { key: "conversion_status", header: "Status", render: r => r.conversion_status },
  ];

  const hasUtmData = Object.keys(growth.signup_source.utm).length > 0;
  const hasHeardFromData = Object.keys(growth.signup_source.heard_from).length > 0;

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-border pb-1 mb-6'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Acquisition and Growth</h1>
        <h4 className='text-foreground text-sm md:text-base'>Founder-facing growth metrics.</h4>
      </div>

      <ChartContainer>
        <section className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
          <div className='rounded-lg border bg-card p-6 shadow-sm'>
            <h4 className='text-gray-900 text-base font-medium mb-1'>Signup source (UTM, automatic capture)</h4>
            <p className='text-xs text-muted-foreground mb-4'>
              Only captured from signups going forward — sparse until new signups accumulate.
            </p>
            {hasUtmData ? (
              <DashboardDonutChart labels={Object.keys(growth.signup_source.utm)} data={Object.values(growth.signup_source.utm)} />
            ) : (
              <p className='text-sm text-muted-foreground py-8 text-center'>No UTM-tagged signups yet.</p>
            )}
          </div>
          <div className='rounded-lg border bg-card p-6 shadow-sm'>
            <h4 className='text-gray-900 text-base font-medium mb-1'>Signup source (self-reported)</h4>
            <p className='text-xs text-muted-foreground mb-4'>
              From the "how did you hear about us" question at signup.
            </p>
            {hasHeardFromData ? (
              <DashboardDonutChart
                labels={Object.keys(growth.signup_source.heard_from)}
                data={Object.values(growth.signup_source.heard_from)}
              />
            ) : (
              <p className='text-sm text-muted-foreground py-8 text-center'>No data yet.</p>
            )}
          </div>
        </section>
      </ChartContainer>

      <section className='mb-8'>
        <h3 className='text-gray-900 text-lg font-medium mb-4'>Top 5 referring organisations</h3>
        {growth.top_5_referring_organisations.length ? (
          <ol className='space-y-2 rounded-lg border bg-card p-6 shadow-sm'>
            {growth.top_5_referring_organisations.map((org, i) => (
              <li key={org.id} className='flex items-center justify-between text-sm'>
                <span>
                  <span className='text-muted-foreground w-5 inline-block'>{i + 1}.</span> {org.company_name}
                </span>
                <span className='font-medium'>{org.referral_count} referrals</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className='text-sm text-muted-foreground py-8 text-center border rounded-lg'>
            No referrals recorded yet — referral tracking is new, so this fills in as orgs start referring others.
          </p>
        )}
      </section>

      <section className='mb-8'>
        <h3 className='text-gray-900 text-lg font-medium mb-4'>Referral programme</h3>
        <DataTable
          columns={referralColumns}
          data={growth.referral_table}
          rowKey={r => `${r.referring_org}-${r.referred_org}-${r.date}`}
          emptyText='No referrals yet'
        />
      </section>

      <section className='mb-8'>
        <h3 className='text-gray-900 text-lg font-medium mb-4'>Activation funnel</h3>
        <div className='rounded-lg border bg-card p-6 shadow-sm space-y-4'>
          {growth.activation_funnel.map(step => (
            <div key={step.step} className='flex items-center justify-between text-sm border-b last:border-0 pb-4 last:pb-0'>
              <span className='font-medium text-gray-900'>{step.step}</span>
              <span className='text-muted-foreground text-right'>
                <span className='block'>
                  {step.median_hours !== null ? `${step.median_hours.toFixed(1)}h median` : "No data yet"}
                </span>
                <span className='block text-xs'>
                  {step.pct_completed}% completed · {step.pct_dropped_off}% dropped off
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className='text-gray-900 text-lg font-medium mb-2'>Cohort retention</h3>
        <p className='text-sm text-muted-foreground mb-4'>
          % of each signup-month cohort still active in each following month.
        </p>
        <CohortRetentionTable rows={growth.cohort_retention_table} />
      </section>
    </>
  );
};

export default GrowthPage;
