import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getCurrentUser } from "@/app/common/services/profile";
import { getMyTickets } from "@/app/common/services/support";
import { handleServerApiCallError } from "@/app/common/utils";
import ServerPagination from "@/app/common/components/ServerPagination";
import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import { TicketStatusBadge, TicketCategoryBadge } from "@/app/common/components/dashboard/TicketBadges";
import { TicketListItem } from "@/app/common/types/support.type";

export const metadata = {
  title: "My Tickets",
};

const MyTicketsPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  await getCurrentUser("recruiter");
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const _page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page as string, 10) : 1;
  const page = Number.isNaN(_page) ? 1 : _page;

  const ticketsRes = await getMyTickets(page).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get my tickets error (support/tickets): ", error);
    errors.push({ title: "Error getting tickets", message: error });
    return null;
  });

  const tickets = ticketsRes?.results ?? [];

  const columns: DataTableColumn<TicketListItem>[] = [
    {
      key: "ticket_number",
      header: "Ticket",
      render: row => (
        <Link
          href={`/recruiter/dashboard/support/tickets/${row.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.ticket_number}
        </Link>
      ),
      className: "text-left",
    },
    { key: "title", header: "Title", render: row => row.title, className: "text-left" },
    { key: "category", header: "Category", render: row => <TicketCategoryBadge category={row.category} /> },
    { key: "status", header: "Status", render: row => <TicketStatusBadge status={row.status} /> },
    { key: "created_at", header: "Submitted", render: row => format(new Date(row.created_at), "MMM dd, yyyy") },
    {
      key: "updated_at",
      header: "Last updated",
      render: row => formatDistanceToNowStrict(new Date(row.updated_at), { addSuffix: true }),
    },
    { key: "reply_count", header: "Replies", render: row => row.reply_count },
  ];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className="border-b w-full border-border pb-1 mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold mb-1 font-space-grotesk">My Tickets</h1>
          <h4 className="text-foreground text-sm md:text-base">
            All support tickets submitted by your organisation.
          </h4>
        </div>
        <Link href="/recruiter/dashboard/support" className="btn btn-primary text-white btn-sm">
          Send a new ticket
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={tickets}
        rowKey={row => row.id}
        emptyText="No tickets yet"
        emptySubText="When you submit a support ticket, it will show up here."
      />

      {!!ticketsRes && <ServerPagination pagedResource={ticketsRes} searchParams={resolvedSearchParams} />}
    </>
  );
};

export default MyTicketsPage;
