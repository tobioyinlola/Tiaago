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

const firstSubject = (campaign: EmailCampaign) => {
  const first = [...campaign.emails].sort((a, b) => a.sequence_number - b.sequence_number)[0];
  return first?.subject || first?.email_template_name || "—";
};

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
          href={["SENT", "SENDING", "CANCELLED"].includes(row.status) ? `/admin/campaigns/${row.id}/analytics` : `/admin/campaigns/${row.id}/edit`}
          className="font-medium hover:underline"
          style={{ color: "#1A3C5E" }}
        >
          {row.name}
        </Link>
      ),
    },
    { key: "subject", header: "First subject", className: "text-left", render: firstSubject },
    { key: "status", header: "Status", render: row => <CampaignStatusBadge status={row.status} /> },
    { key: "pool", header: "Audience pool", render: row => (row.audience_pool === "TALENT_NETWORK" ? "Talent Network" : "Companies") },
    {
      key: "audience",
      header: "Audience",
      render: row =>
        row.audience_pool === "TALENT_NETWORK"
          ? "Talent Network filters"
          : row.audience_segment_name || row.audience_tag_name || (row.manual_organisation_ids.length ? `${row.manual_organisation_ids.length} manual orgs` : row.audience_type === "ALL" ? "All recruiters" : "—"),
    },
    { key: "emails", header: "Emails", render: row => row.emails.length },
    { key: "recipient_count", header: "Recipients", render: row => row.recipient_count },
    { key: "scheduled_for", header: "Scheduled for", render: row => formatExact(row.scheduled_for) },
    { key: "sent_at", header: "Sent at", render: row => formatExact(row.sent_at) },
  ];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className="border-b w-full border-[#E0E0E0] pb-1 mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold mb-1 font-space-grotesk" style={{ color: "#1A3C5E" }}>
            Campaigns
          </h1>
          <h4 className="text-sm md:text-base" style={{ color: "#9E9E9E" }}>
            Email campaigns and drip sequences sent to companies or the Talent Network.
          </h4>
        </div>
        <Link href="/admin/campaigns/new" className="btn btn-sm text-white hover:opacity-90" style={{ backgroundColor: "#1A3C5E" }}>
          + New campaign
        </Link>
      </div>

      <DataTable columns={columns} data={campaigns} rowKey={row => row.id} emptyText="No campaigns yet" />
    </>
  );
};

export default AdminCampaignsPage;
