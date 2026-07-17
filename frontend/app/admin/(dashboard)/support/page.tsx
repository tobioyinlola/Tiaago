import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getAdminTickets } from "@/app/common/services/support";
import { handleServerApiCallError } from "@/app/common/utils";
import ServerPagination from "@/app/common/components/ServerPagination";
import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import { TicketStatusBadge, TicketPriorityBadge, TicketCategoryBadge } from "@/app/common/components/dashboard/TicketBadges";
import { AdminTicketListItem, TicketCategory, TicketPriority, TicketStatus } from "@/app/common/types/support.type";
import AdminSupportControls from "./_components/AdminSupportControls";

export const metadata = {
  title: "Support",
};

const AdminSupportPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const _page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page as string, 10) : 1;
  const page = Number.isNaN(_page) ? 1 : _page;
  const q = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : undefined;
  const status = typeof resolvedSearchParams.status === "string" ? (resolvedSearchParams.status as TicketStatus) : undefined;
  const priority = typeof resolvedSearchParams.priority === "string" ? (resolvedSearchParams.priority as TicketPriority) : undefined;
  const category = typeof resolvedSearchParams.category === "string" ? (resolvedSearchParams.category as TicketCategory) : undefined;

  const ticketsRes = await getAdminTickets({ page, q, status, priority, category }).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get admin tickets error (admin support): ", error);
    errors.push({ title: "Error getting tickets", message: error });
    return null;
  });

  const tickets = ticketsRes?.results ?? [];
  const hasFilters = !!(q || status || priority || category);

  const columns: DataTableColumn<AdminTicketListItem>[] = [
    {
      key: "ticket_number",
      header: "Ticket",
      render: row => (
        <Link href={`/admin/support/${row.id}`} className="font-medium text-primary hover:underline">
          {row.ticket_number}
        </Link>
      ),
      className: "text-left",
    },
    {
      key: "company_name",
      header: "Organisation",
      render: row => (
        <Link href={`/admin/organisations/${row.company_id}`} className="text-primary hover:underline">
          {row.company_name}
        </Link>
      ),
      className: "text-left",
    },
    { key: "submitted_by", header: "Submitted by", render: row => row.submitted_by?.name },
    { key: "title", header: "Title", render: row => row.title, className: "text-left" },
    { key: "category", header: "Category", render: row => <TicketCategoryBadge category={row.category} /> },
    { key: "status", header: "Status", render: row => <TicketStatusBadge status={row.status} /> },
    { key: "priority", header: "Priority", render: row => <TicketPriorityBadge priority={row.priority} /> },
    { key: "created_at", header: "Created", render: row => format(new Date(row.created_at), "MMM dd, yyyy") },
    {
      key: "updated_at",
      header: "Last updated",
      render: row => formatDistanceToNowStrict(new Date(row.updated_at), { addSuffix: true }),
    },
    { key: "reply_count", header: "Replies", render: row => row.reply_count },
    { key: "assigned_to", header: "Assigned to", render: row => row.assigned_to?.name ?? "—" },
  ];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className="border-b w-full border-border pb-1 mb-6">
        <h1 className="text-2xl font-bold mb-1 font-space-grotesk">Support</h1>
        <h4 className="text-foreground text-sm md:text-base">
          Every support ticket across every organisation.
        </h4>
      </div>

      <AdminSupportControls />

      <DataTable
        columns={columns}
        data={tickets}
        rowKey={row => row.id}
        emptyText={hasFilters ? "No tickets match your filters" : "No tickets yet"}
        emptySubText={hasFilters ? "Try a different search term or clear the filters." : undefined}
      />

      {!!ticketsRes && <ServerPagination pagedResource={ticketsRes} searchParams={resolvedSearchParams} />}
    </>
  );
};

export default AdminSupportPage;
