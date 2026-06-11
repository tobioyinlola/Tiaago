import { format, formatDistanceToNowStrict } from "date-fns";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import ScrollArea from "@/app/common/components/ScrollArea";
import ServerPagination from "@/app/common/components/ServerPagination";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";
import {
  getEmailTracks,
  getEmailTrackStats,
} from "@/app/common/services/email-tracks";
import { cn, handleServerApiCallError } from "@/app/common/utils";
import DeliveryStatusBadge from "./_components/DeliveryStatusBadge";
import EmailLogsControls from "./_components/EmailLogsControls";

export const metadata = {
  title: "Email Logs",
};

const formatExact = (value: string) =>
  format(new Date(value), "MMM dd, yyyy hh:mm a");

const formatRelative = (value: string) =>
  formatDistanceToNowStrict(new Date(value), { addSuffix: true });

const EngagementCell = ({ at }: { at: string | null }) =>
  at ? (
    <span className='whitespace-nowrap'>
      <span className='text-badge-green-text font-semibold' aria-hidden>
        ✓{" "}
      </span>
      <span title={formatExact(at)}>{formatRelative(at)}</span>
    </span>
  ) : (
    <span className='text-muted-foreground'>—</span>
  );

const EmailLogsPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const _page = resolvedSearchParams.page
    ? parseInt(resolvedSearchParams.page as string, 10)
    : 1;
  const page = Number.isNaN(_page) ? 1 : _page;
  const search =
    typeof resolvedSearchParams.q === "string"
      ? resolvedSearchParams.q
      : undefined;
  const delivery_status =
    typeof resolvedSearchParams.delivery_status === "string"
      ? resolvedSearchParams.delivery_status
      : undefined;
  const email_type =
    typeof resolvedSearchParams.email_type === "string"
      ? resolvedSearchParams.email_type
      : undefined;
  const hasFilters = !!(search || delivery_status || email_type);

  const [tracksRes, stats] = await Promise.all([
    getEmailTracks({ page, search, delivery_status, email_type }).catch(
      async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get email tracks error (admin email logs): ", error);
        errors.push({
          title: "Error getting email logs",
          message: error,
        });
        return null;
      }
    ),
    getEmailTrackStats().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get email track stats error (admin email logs): ", error);
      errors.push({
        title: "Error getting email stats",
        message: error,
      });
      return null;
    }),
  ]);

  const tracks = tracksRes?.results ?? [];
  const statCards = stats
    ? [
        { label: "Sent (last 24h)", value: stats.sent_24h, alert: false },
        {
          label: "Delivered rate (7d)",
          value: `${stats.delivered_rate_7d}%`,
          alert: false,
        },
        {
          label: "Bounces (7d)",
          value: stats.bounced_7d,
          alert: stats.bounced_7d > 0,
        },
        {
          label: "Complaints (7d)",
          value: stats.complained_7d,
          alert: stats.complained_7d > 0,
        },
      ]
    : [];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-border pb-1 mb-8'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
          Email Logs
        </h1>
        <h4 className='text-foreground text-sm md:text-base'>
          Monitor delivery of every email the platform sends
        </h4>
      </div>
      {!!statCards.length && (
        <div className='mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
          {statCards.map(card => (
            <div
              key={card.label}
              className='rounded-lg border bg-card text-card-foreground p-6 shadow-sm'
            >
              <p className='text-sm text-muted-foreground'>{card.label}</p>
              <p
                className={cn(
                  "mt-2 font-space-grotesk text-3xl font-semibold",
                  card.alert && "text-destructive"
                )}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}
      <EmailLogsControls emailTypes={stats?.email_types ?? []} />
      <ScrollArea className='border mb-8 rounded dashboard-content-constraint'>
        <table className='table table-zebra text-sm text-center'>
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Type</th>
              <th>Delivery Status</th>
              <th className='max-sm:hidden'>Opened</th>
              <th className='max-sm:hidden'>Clicked</th>
              <th>Sent</th>
            </tr>
          </thead>
          <tbody className='text-foreground text-xs'>
            {tracks.length ? (
              tracks.map(track => {
                const isProblem =
                  track.delivery_status === "bounced" ||
                  track.delivery_status === "complained";
                return (
                  <tr
                    key={track.id}
                    className={cn(isProblem && "[&>td]:!bg-destructive/10")}
                  >
                    <td className='font-medium'>{track.email}</td>
                    <td>{track.email_type}</td>
                    <td>
                      <DeliveryStatusBadge status={track.delivery_status} />
                    </td>
                    <td className='max-sm:hidden'>
                      <EngagementCell at={track.opened_at} />
                    </td>
                    <td className='max-sm:hidden'>
                      <EngagementCell at={track.clicked_at} />
                    </td>
                    <td title={formatExact(track.created_at)}>
                      {formatRelative(track.created_at)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6}>
                  {hasFilters ? (
                    <EmptyStateV3
                      text='No emails match your filters'
                      subText='Try a different search term or clear the filters.'
                    />
                  ) : (
                    <EmptyStateV3
                      text='No emails sent yet'
                      subText='Emails sent by the platform (verification, notifications, receipts) will appear here with their delivery status.'
                    />
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
      {!!tracksRes && (
        <ServerPagination
          pagedResource={tracksRes}
          searchParams={resolvedSearchParams}
        />
      )}
    </>
  );
};

export default EmailLogsPage;
