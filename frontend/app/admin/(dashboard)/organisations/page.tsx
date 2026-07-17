import Link from "next/link";
import { redirect } from "next/navigation";
import { format, formatDistanceToNowStrict } from "date-fns";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getCurrentUser } from "@/app/common/services/profile";
import { getOrganisations, getOrganisationAlerts } from "@/app/common/services/organisations";
import { handleServerApiCallError, cn } from "@/app/common/utils";
import ServerPagination from "@/app/common/components/ServerPagination";
import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import SortableHeader from "@/app/common/components/dashboard/SortableHeader";
import AlertBanner from "@/app/common/components/dashboard/AlertBanner";
import { OrganisationRow } from "@/app/common/types/analytics.type";
import OrgStatusBadge from "./_components/OrgStatusBadge";
import OrganisationsControls from "./_components/OrganisationsControls";

export const metadata = {
  title: "Organisations",
};

const formatExact = (value: string) => format(new Date(value), "MMM dd, yyyy hh:mm a");
const formatRelative = (value: string) => formatDistanceToNowStrict(new Date(value), { addSuffix: true });

const OrganisationsPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const { currentUser } = await getCurrentUser("staff");
  const canView = currentUser.is_super_admin || currentUser.permissions.includes("organisations.view");
  if (!canView) {
    redirect("/admin/unauthorised?permission=organisations.view");
  }

  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const _page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page as string, 10) : 1;
  const page = Number.isNaN(_page) ? 1 : _page;
  const q = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : undefined;
  const status = typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : undefined;
  const walletBelowRaw =
    typeof resolvedSearchParams.wallet_below === "string" ? resolvedSearchParams.wallet_below : undefined;
  const wallet_below = walletBelowRaw ? parseFloat(walletBelowRaw) : undefined;
  const ordering = typeof resolvedSearchParams.ordering === "string" ? resolvedSearchParams.ordering : "-created_at";
  const tagsParam = typeof resolvedSearchParams.tags === "string" ? resolvedSearchParams.tags : undefined;
  const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : undefined;
  const tag_match = resolvedSearchParams.tag_match === "all" ? "all" : "any";

  const [orgsRes, alerts] = await Promise.all([
    getOrganisations({ page, q, status, wallet_below, ordering, tags, tag_match }).catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get organisations error (admin organisations): ", error);
      errors.push({ title: "Error getting organisations", message: error });
      return null;
    }),
    getOrganisationAlerts().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get organisation alerts error (admin organisations): ", error);
      errors.push({ title: "Error getting alerts", message: error });
      return null;
    }),
  ]);

  const orgs = orgsRes?.results ?? [];
  const hasFilters = !!(q || status || wallet_below !== undefined || (tags && tags.length));

  const columns: DataTableColumn<OrganisationRow>[] = [
    {
      key: "company_name",
      header: "Organisation",
      render: row => (
        <Link href={`/admin/organisations/${row.id}`} className='font-medium text-primary hover:underline'>
          {row.company_name}
        </Link>
      ),
      className: "text-left",
    },
    {
      key: "tags",
      header: "Tags",
      className: "text-left",
      render: row => (
        <div className='flex flex-wrap gap-1 max-w-xs'>
          {row.tags.slice(0, 4).map(tag => (
            <Link
              key={tag.slug}
              href={`/admin/organisations?tags=${tag.slug}`}
              className='badge badge-sm text-white hover:opacity-80'
              style={{ backgroundColor: tag.colour }}
            >
              {tag.name}
            </Link>
          ))}
          {row.tags.length > 4 && (
            <span className='badge badge-sm badge-ghost'>+{row.tags.length - 4} more</span>
          )}
          {!row.tags.length && <span className='text-muted-foreground text-xs'>—</span>}
        </div>
      ),
    },
    { key: "date_joined", header: "Date joined", render: row => formatExact(row.date_joined) },
    { key: "status", header: "Status", render: row => <OrgStatusBadge status={row.status} /> },
    {
      key: "wallet_balance_ngn",
      header: "Wallet balance",
      render: row => (
        <span className={cn(row.wallet_low && "text-destructive font-semibold")}>
          ₦{row.wallet_balance_ngn.toLocaleString()}
        </span>
      ),
    },
    { key: "total_resumes_screened", header: "Resumes screened", render: row => row.total_resumes_screened },
    { key: "total_assessments_taken", header: "Assessments taken", render: row => row.total_assessments_taken },
    { key: "active_jobs_count", header: "Active jobs", render: row => row.active_jobs_count },
    { key: "team_members_count", header: "Team members", render: row => row.team_members_count },
    {
      key: "last_active",
      header: "Last active",
      render: row => (row.last_active ? formatRelative(row.last_active) : <span className='text-muted-foreground'>—</span>),
    },
    { key: "total_spend_ngn", header: "Total spend", render: row => `₦${row.total_spend_ngn.toLocaleString()}` },
    {
      key: "monthly_avg_spend_ngn",
      header: "Monthly avg spend",
      render: row => `₦${row.monthly_avg_spend_ngn.toLocaleString()}`,
    },
  ];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-border pb-1 mb-6'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Organisations</h1>
        <h4 className='text-foreground text-sm md:text-base'>
          Every organisation on the platform, their wallet status, and their usage.
        </h4>
      </div>

      {alerts && (
        <div className='mb-6'>
          <AlertBanner
            id='low-wallet'
            title='Low wallet balance'
            description='Organisations with wallet balance below ₦500.'
            count={alerts.low_wallet_balance.length}
          />
          <AlertBanner
            id='no-login'
            title='No login in 14+ days'
            description='Organisations whose rep hasn’t logged in for two weeks or more.'
            count={alerts.no_login_14d_plus.length}
          />
          <AlertBanner
            id='never-screened'
            title='Signed up but never screened a resume'
            description='Organisations that joined 7+ days ago and have never screened a candidate.'
            count={alerts.never_screened_after_7d.length}
          />
          <AlertBanner
            id='one-login-team'
            title='Team exists but only one person has logged in'
            description='Organisations with multiple team members where only one has ever signed in.'
            count={alerts.team_exists_but_one_login.length}
          />
        </div>
      )}

      <OrganisationsControls />

      <div className='mb-2 overflow-x-auto'>
        <div className='flex gap-4 text-xs font-medium text-muted-foreground px-1 whitespace-nowrap'>
          <SortableHeader field='company_name' label='Sort: Name' currentOrdering={ordering} searchParams={resolvedSearchParams} />
          <SortableHeader field='created_at' label='Sort: Date joined' currentOrdering={ordering} searchParams={resolvedSearchParams} />
          <SortableHeader field='wallet_balance_ngn' label='Sort: Wallet balance' currentOrdering={ordering} searchParams={resolvedSearchParams} />
          <SortableHeader field='total_spend_ngn' label='Sort: Total spend' currentOrdering={ordering} searchParams={resolvedSearchParams} />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={orgs}
        rowKey={row => row.id}
        emptyText={hasFilters ? "No organisations match your filters" : "No organisations yet"}
        emptySubText={hasFilters ? "Try a different search term or clear the filters." : undefined}
      />

      {!!orgsRes && <ServerPagination pagedResource={orgsRes} searchParams={resolvedSearchParams} />}
    </>
  );
};

export default OrganisationsPage;
