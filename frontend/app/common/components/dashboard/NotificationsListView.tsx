import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getNotifications } from "@/app/common/services/notifications";
import { handleServerApiCallError } from "@/app/common/utils";
import ServerPagination from "@/app/common/components/ServerPagination";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";
import NotificationRow from "@/app/common/components/dashboard/NotificationRow";
import MarkAllNotificationsReadButton from "@/app/common/components/dashboard/MarkAllNotificationsReadButton";

const NotificationsListView = async ({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const _page = searchParams.page ? parseInt(searchParams.page as string, 10) : 1;
  const page = Number.isNaN(_page) ? 1 : _page;

  const notificationsRes = await getNotifications(page).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get notifications error (notifications page): ", error);
    errors.push({ title: "Error getting notifications", message: error });
    return null;
  });

  const notifications = notificationsRes?.results ?? [];

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className="border-b w-full border-border pb-1 mb-6 flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold mb-1 font-space-grotesk">Notifications</h1>
          <h4 className="text-foreground text-sm md:text-base">All your notifications, newest first.</h4>
        </div>
        {!!notifications.length && <MarkAllNotificationsReadButton />}
      </div>

      {notifications.length ? (
        <div className="rounded-lg border border-[#EAECEE] divide-y divide-[#EAECEE]">
          {notifications.map(notification => (
            <NotificationRow key={notification.id} notification={notification} />
          ))}
        </div>
      ) : (
        <EmptyStateV3 text="No notifications yet" subText="Announcements and updates from Tiaago will appear here." />
      )}

      {!!notificationsRes && <ServerPagination pagedResource={notificationsRes} searchParams={searchParams} />}
    </>
  );
};

export default NotificationsListView;
