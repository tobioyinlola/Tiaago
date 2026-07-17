import { getCurrentUser } from "@/app/common/services/profile";
import NotificationsListView from "@/app/common/components/dashboard/NotificationsListView";

export const metadata = {
  title: "Notifications",
};

const TalentNotificationsPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  await getCurrentUser("talent");
  const resolvedSearchParams = await searchParams;
  return <NotificationsListView searchParams={resolvedSearchParams} />;
};

export default TalentNotificationsPage;
