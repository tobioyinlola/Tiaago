import { notFound } from "next/navigation";
import { format, formatDistanceToNowStrict } from "date-fns";

import { getOrganisationDetail } from "@/app/common/services/organisations";
import { getCustomTags, getOrganisationTagTimeline, getOrganisationTags } from "@/app/common/services/tags";
import StatCard from "@/app/common/components/dashboard/StatCard";
import { cn } from "@/app/common/utils";
import OrgStatusBadge from "../_components/OrgStatusBadge";
import OrganisationTagsSection from "../_components/OrganisationTagsSection";

export const metadata = {
  title: "Organisation Detail",
};

const formatExact = (value: string) => format(new Date(value), "MMM dd, yyyy hh:mm a");
const formatRelative = (value: string) => formatDistanceToNowStrict(new Date(value), { addSuffix: true });

const eventLabel = (event: any) => {
  if (event.type === "resume_screened") return `Resume screened${event.score !== null ? ` (score: ${event.score})` : ""}`;
  if (event.type === "assessment_created") return "Assessment created";
  if (event.type === "billing")
    return `${event.transaction_type === "credit" ? "Wallet credited" : "Wallet debited"} ₦${event.amount.toLocaleString()}${
      event.service_type ? ` (${event.service_type.replaceAll("_", " ")})` : ""
    }`;
  return event.type;
};

const OrganisationDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const org = await getOrganisationDetail(id).catch(() => null);
  if (!org) return notFound();

  const [currentTags, customTags, tagTimeline] = await Promise.all([
    getOrganisationTags(id).catch(() => []),
    getCustomTags().catch(() => []),
    getOrganisationTagTimeline(id).catch(() => []),
  ]);

  return (
    <>
      <div className='border-b w-full border-border pb-1 mb-6 flex items-center justify-between flex-wrap gap-2'>
        <div>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>{org.company_name}</h1>
          <h4 className='text-foreground text-sm md:text-base'>
            Joined {formatExact(org.date_joined)}
          </h4>
        </div>
        <OrgStatusBadge status={org.status} />
      </div>

      <div className='flex flex-wrap gap-x-8 gap-y-1 text-sm text-foreground mb-8'>
        <span>
          <span className='text-muted-foreground'>Contact: </span>
          {org.contact_name || <span className='text-muted-foreground'>—</span>}
        </span>
        <span>
          <span className='text-muted-foreground'>Email: </span>
          {org.company_email || <span className='text-muted-foreground'>—</span>}
        </span>
        <span>
          <span className='text-muted-foreground'>Phone: </span>
          {org.phone_number || <span className='text-muted-foreground'>—</span>}
        </span>
      </div>

      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
        <StatCard
          label='Wallet balance'
          value={`₦${org.wallet_balance_ngn.toLocaleString()}`}
          alert={org.wallet_low}
        />
        <StatCard label='Total resumes screened' value={org.total_resumes_screened} />
        <StatCard label='Total assessments taken' value={org.total_assessments_taken} />
        <StatCard label='Active jobs' value={org.active_jobs_count} />
        <StatCard label='Team members' value={org.team_members_count} />
        <StatCard label='Total spend (all time)' value={`₦${org.total_spend_ngn.toLocaleString()}`} />
        <StatCard label='Monthly avg spend (3mo)' value={`₦${org.monthly_avg_spend_ngn.toLocaleString()}`} />
        <StatCard
          label='Last active'
          value={org.last_active ? formatRelative(org.last_active) : null}
        />
      </div>

      <OrganisationTagsSection companyId={id} currentTags={currentTags} customTags={customTags} timeline={tagTimeline} />

      <h3 className='text-gray-900 text-lg font-medium mb-4'>Activity & billing timeline</h3>
      <div className='rounded-lg border divide-y'>
        {org.timeline.length ? (
          org.timeline.map((event, i) => (
            <div key={i} className='flex items-center justify-between px-4 py-3 text-sm'>
              <span
                className={cn(
                  event.type === "billing" && "text-primary",
                  event.type === "resume_screened" && "text-badge-green-text",
                  event.type === "assessment_created" && "text-badge-blue-text"
                )}
              >
                {eventLabel(event)}
              </span>
              <span className='text-muted-foreground text-xs' title={formatExact(event.date)}>
                {formatRelative(event.date)}
              </span>
            </div>
          ))
        ) : (
          <p className='px-4 py-8 text-center text-sm text-muted-foreground'>
            No activity recorded yet for this organisation.
          </p>
        )}
      </div>
    </>
  );
};

export default OrganisationDetailPage;
