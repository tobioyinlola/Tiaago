import { notFound } from "next/navigation";
import { format } from "date-fns";

import { getCurrentUser } from "@/app/common/services/profile";
import { getTicketDetail } from "@/app/common/services/support";
import { TicketStatusBadge, TicketPriorityBadge, TicketCategoryBadge } from "@/app/common/components/dashboard/TicketBadges";
import TicketThread from "./_components/TicketThread";

export const metadata = {
  title: "Ticket Detail",
};

const TicketDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  await getCurrentUser("recruiter");
  const { id } = await params;
  const ticket = await getTicketDetail(id).catch(() => null);
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
          {ticket.title} · Submitted {format(new Date(ticket.created_at), "MMM dd, yyyy")}
        </h4>
      </div>

      <TicketThread ticket={ticket} />
    </>
  );
};

export default TicketDetailPage;
