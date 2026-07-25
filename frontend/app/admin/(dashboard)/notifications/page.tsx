import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getNotificationHistory } from "@/app/common/services/notifications";
import { handleServerApiCallError } from "@/app/common/utils";
import NotificationComposeForm from "./_components/NotificationComposeForm";
import NotificationHistoryTable from "./_components/NotificationHistoryTable";
import ServerPagination from "@/app/common/components/ServerPagination";
import { ISearchParams } from "@/app/common/types";

export const metadata = {
  title: "Notifications",
};

const AdminNotificationsPage = async ({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const _page = resolvedSearchParams.page
    ? parseInt(resolvedSearchParams.page as string)
    : 1;
  const page = isNaN(_page) ? 1 : _page;

  const historyRes = await getNotificationHistory(page).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get notification history error (admin notifications): ", error);
    errors.push({ title: "Error getting notification history", message: error });
    return null;
  });

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className="border-b w-full border-border pb-1 mb-6">
        <h1 className="text-2xl font-bold mb-1 font-space-grotesk">Notifications</h1>
        <h4 className="text-foreground text-sm md:text-base">
          Send broadcast notifications to all users or a specific organisation.
        </h4>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 items-start">
        <NotificationComposeForm />
        <div>
          <h3 className="text-gray-900 text-lg font-medium mb-4">History</h3>
          <NotificationHistoryTable notifications={historyRes?.results ?? []} />
          {!!historyRes && (
            <ServerPagination
              pagedResource={historyRes}
              searchParams={resolvedSearchParams}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default AdminNotificationsPage;
