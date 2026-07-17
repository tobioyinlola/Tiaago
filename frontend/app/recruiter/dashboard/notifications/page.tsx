import { getCurrentUser } from "@/app/common/services/profile";
import NotificationsListView from "@/app/common/components/dashboard/NotificationsListView";

export const metadata = {
  title: "Notifications",
};

const RecruiterNotificationsPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  await getCurrentUser("recruiter");
  const resolvedSearchParams = await searchParams;
  return <NotificationsListView searchParams={resolvedSearchParams} />;
};

export default RecruiterNotificationsPage;
