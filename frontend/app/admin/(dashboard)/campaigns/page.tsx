import Link from "next/link";
import { format } from "date-fns";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import DataTable, { DataTableColumn } from "@/app/common/components/dashboard/DataTable";
import { getCampaigns } from "@/app/common/services/campaigns";
import { handleServerApiCallError } from "@/app/common/utils";
import { EmailCampaign } from "@/app/common/types/campaigns.type";
import CampaignStatusBadge from "./_components/CampaignStatusBadge";

export const metadata = {
  title: "Campaigns",
};

const formatExact = (value: string | null) => (value ? format(new Date(value), "MMM dd, yyyy hh:mm a") : "—");

const AdminCampaignsPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const campaigns = await getCampaigns().catch(async e => {
    errors.push({ title: "Error loading campaigns", message: await handleServerApiCallError(e) });
    return [];
  });

  const columns: DataTableColumn<EmailCampaign>[] = [
    {
      key: "name",
      header: "Campaign",
      className: "text-left",
      render: row => (
        <Link
          href={row.status === "SENT" || row.status === "SENDING" ? `/admin/campaigns/${row.id}/analytics` : `/admin/campaigns/${row.id}/edit`}
          className="font-medium text-primary hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    { key: "subject_line", header: "Subject line", className: "text-left", render: row => row.subject_line || "—" },
    { key: "status", header: "Status", render: row => <CampaignStatusBadge status={row.status} /> },
    {
      key: "audience",
      header: "Audience",
      render: row =>
        row.audience_segment_name || row.audience_tag_name || (row.manual_organisation_ids.length ? `${row.manual_organisation_ids.length} manual orgs` : "—"),
    },
    { key: "email_template_name", header: "Template", render: row => row.email_template_name ?? "—" },
    { key: "recipient_count", header: "Recipients", render: row => row.recipient_count },
    { key: "scheduled_for", header: "Scheduled for", render: row => formatExact(row.scheduled_for) },
    { key: "sent_at", header: "Sent at", render: row => formatExact(row.sent_at) },
  ];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className="border-b w-full border-border pb-1 mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold mb-1 font-space-grotesk">Campaigns</h1>
          <h4 className="text-foreground text-sm md:text-base">Email campaigns sent to segments, tags, or hand-picked organisations.</h4>
        </div>
        <Link href="/admin/campaigns/new" className="btn btn-primary btn-sm">
          + New campaign
        </Link>
      </div>

      <DataTable columns={columns} data={campaigns} rowKey={row => row.id} emptyText="No campaigns yet" />
    </>
  );
};

export default AdminCampaignsPage;
