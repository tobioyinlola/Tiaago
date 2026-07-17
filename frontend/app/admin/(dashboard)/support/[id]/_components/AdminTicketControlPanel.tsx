"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import DaisyButton from "@/app/common/components/DaisyButton";
import { updateAdminTicket } from "@/app/common/services/support";
import { TicketDetail, TicketCategory, TicketPriority, TicketStatus } from "@/app/common/types/support.type";

const STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const CATEGORIES: TicketCategory[] = ["BILLING", "TECHNICAL", "ACCOUNT", "ASSESSMENTS", "PIPELINE", "OTHER"];

type StaffOption = { id: number; name: string; email: string };

const AdminTicketControlPanel = ({
  ticket,
  staff,
}: {
  ticket: TicketDetail;
  staff: StaffOption[];
}) => {
  const router = useRouter();
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [category, setCategory] = useState(ticket.category);
  const [assignedTo, setAssignedTo] = useState<number | "">(ticket.assigned_to?.id ?? "");
  const [saving, setSaving] = useState(false);

  // router.refresh() after a reply re-fetches `ticket` server-side (e.g. a
  // non-internal admin reply bumps OPEN -> IN_PROGRESS) but this component's
  // state is seeded once from props, so it needs to be re-synced explicitly.
  useEffect(() => {
    setStatus(ticket.status);
    setPriority(ticket.priority);
    setCategory(ticket.category);
    setAssignedTo(ticket.assigned_to?.id ?? "");
  }, [ticket.status, ticket.priority, ticket.category, ticket.assigned_to?.id]);

  const save = async (payload: Record<string, unknown>) => {
    setSaving(true);
    const result = await updateAdminTicket(ticket.id, payload);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Ticket updated.");
    router.refresh();
  };

  const selectClass = "select select-bordered select-sm w-full";

  return (
    <div className="rounded-lg border border-[#EAECEE] bg-white p-4 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-primary-black">Ticket controls</h3>

      <div>
        <label className="label-text text-xs font-medium text-secondary-black mb-1 block">Status</label>
        <select
          className={selectClass}
          value={status}
          onChange={e => {
            const value = e.target.value as TicketStatus;
            setStatus(value);
            save({ status: value });
          }}
          disabled={saving}
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label-text text-xs font-medium text-secondary-black mb-1 block">Priority</label>
        <select
          className={selectClass}
          value={priority}
          onChange={e => {
            const value = e.target.value as TicketPriority;
            setPriority(value);
            save({ priority: value });
          }}
          disabled={saving}
        >
          {PRIORITIES.map(p => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label-text text-xs font-medium text-secondary-black mb-1 block">Category</label>
        <select
          className={selectClass}
          value={category}
          onChange={e => {
            const value = e.target.value as TicketCategory;
            setCategory(value);
            save({ category: value });
          }}
          disabled={saving}
        >
          {CATEGORIES.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label-text text-xs font-medium text-secondary-black mb-1 block">Assigned to</label>
        <select
          className={selectClass}
          value={assignedTo}
          onChange={e => {
            const value = e.target.value ? Number(e.target.value) : "";
            setAssignedTo(value);
            save({ assigned_to: value || null });
          }}
          disabled={saving}
        >
          <option value="">Unassigned</option>
          {staff.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default AdminTicketControlPanel;
