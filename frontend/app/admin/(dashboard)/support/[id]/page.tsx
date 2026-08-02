import { notFound } from "next/navigation";
import { format } from "date-fns";

import { getAdminTicketDetail, getAdminStaffList } from "@/app/common/services/support";
import { TicketStatusBadge, TicketPriorityBadge, TicketCategoryBadge } from "@/app/common/components/dashboard/TicketBadges";
import AdminTicketThread from "./_components/AdminTicketThread";
import AdminTicketControlPanel from "./_components/AdminTicketControlPanel";

export const metadata = {
  title: "Ticket Detail",
};

const AdminTicketDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const [ticket, staff] = await Promise.all([
    getAdminTicketDetail(id).catch(() => null),
    getAdminStaffList().catch(() => []),
  ]);
  if (!ticket) return notFound();

  return (
    <>
      <div className="border-b w-full border-border pb-1 mb-6">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <h1 className="text-2xl font-bold font-space-grotesk">{ticket.ticket_number}</h1>
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
          <TicketCategoryBadge category={ticket.category} />
        </div>
        <h4 className="text-foreground text-sm md:text-base">
          {ticket.title} · {ticket.company_name || "Website visitor"} ·{" "}
          {ticket.submitted_by?.name ?? ticket.contact_name} · Submitted{" "}
          {format(new Date(ticket.created_at), "MMM dd, yyyy")}
        </h4>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <AdminTicketThread ticket={ticket} />
        <AdminTicketControlPanel ticket={ticket} staff={staff} />
      </div>
    </>
  );
};

export default AdminTicketDetailPage;
