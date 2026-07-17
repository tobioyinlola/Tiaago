"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";

import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import { SelectInput } from "@/app/common/components/dashboard/SelectInput";
import { CampaignAnalytics } from "@/app/common/types/campaigns.type";

type Recipient = CampaignAnalytics["recipients"][number];

const PAGE_SIZE = 20;
const STATUSES = ["QUEUED", "SENT", "DELIVERED", "OPENED", "CLICKED", "BOUNCED", "FAILED", "UNSUBSCRIBED"];

const RecipientsTable = ({ recipients }: { recipients: Recipient[] }) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return recipients.filter(r => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.organisation ?? "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [recipients, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: DataTableColumn<Recipient>[] = [
    { key: "name", header: "Name", className: "text-left", render: r => r.name },
    { key: "organisation", header: "Organisation", className: "text-left", render: r => r.organisation ?? "—" },
    { key: "email", header: "Email", className: "text-left", render: r => r.email },
    { key: "status", header: "Status", render: r => <span className="badge badge-sm">{r.status}</span> },
    { key: "opened_at", header: "Opened at", render: r => (r.opened_at ? format(new Date(r.opened_at), "MMM dd, HH:mm") : "—") },
    { key: "clicked_at", header: "Clicked at", render: r => (r.clicked_at ? format(new Date(r.clicked_at), "MMM dd, HH:mm") : "—") },
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          type="text"
          placeholder="Search by name, email, or organisation..."
          className="input input-bordered input-sm max-w-xs"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="w-48">
          <SelectInput
            size="sm"
            placeholder="All statuses"
            options={STATUSES.map(s => ({ value: s, label: s }))}
            value={statusFilter || null}
            onChange={value => {
              setStatusFilter(value ?? "");
              setPage(1);
            }}
          />
        </div>
      </div>

      <DataTable columns={columns} data={pageItems} rowKey={r => r.id} emptyText="No recipients match your filters" />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mb-8">
          <button type="button" className="btn btn-sm btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button type="button" className="btn btn-sm btn-ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </button>
        </div>
      )}
    </>
  );
};

export default RecipientsTable;
