import { isSameMonth } from "date-fns";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import { getTalentRoles } from "@/app/common/services";
import { FindTalents } from "../components/ExploreTalents";
import { getSchedule } from "@/app/common/services/schedule";
import { handleServerApiCallError } from "@/app/common/utils";
import { FREE_RECRUITER_MAX_MEETINGS_PER_MONTH } from "@/app/common/constants";
import { getAllTalents, getCurrentUser } from "@/app/common/services/profile";
import { ISearchParams } from "@/app/common/types";

export const metadata = {
  title: "Find Talents",
};

const FindTalentsPage = async ({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams.page ? Number(resolvedSearchParams.page) : 1;
  const search =
    typeof resolvedSearchParams.search === "string"
      ? resolvedSearchParams.search
      : undefined;
  const role =
    typeof resolvedSearchParams.role === "string"
      ? resolvedSearchParams.role
      : undefined;
  const experienceLevel =
    typeof resolvedSearchParams.experience_level === "string"
      ? resolvedSearchParams.experience_level
      : undefined;

  // currentUser, roles, and talents are independent requests -- fetch in
  // parallel instead of waiting on currentUser first.
  const [userRes, roles, talentsRes] = await Promise.all([
    getCurrentUser("recruiter"),
    getTalentRoles().catch(async (e: any) => {
      const error = await handleServerApiCallError(e);
      console.log("Get talent roles error (find talents): ", error);
      errors.push({
        message: error,
        title: "Error getting talent roles",
      });
      return [];
    }),
    getAllTalents(page, undefined, search, role, experienceLevel).catch(async (e: any) => {
      const error = await handleServerApiCallError(e);
      console.log("Get talents error (find talents): ", error);
      errors.push({
        message: error,
        title: "Error getting talents",
      });
      return null;
    }),
  ]);
  const currentUser = userRes.currentUser;
  const isApproved = currentUser.verified;

  const schedule = isApproved
    ? await getSchedule().catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get schedule error (find talents): ", error);
        errors.push({
          message: error,
          title: "Error getting schedule",
        });
        return [];
      })
    : [];
  const noOfSchedulesThisMonth = schedule.filter(meeting =>
    // meeting.accepted !== false &&
    isSameMonth(new Date(meeting.created_on), new Date())
  ).length;
  const canScheduleMeeting = currentUser.subscribed_plan
    ? true
    : noOfSchedulesThisMonth < FREE_RECRUITER_MAX_MEETINGS_PER_MONTH;
  return (
    <>
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
          Find Talents
        </h1>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Discover talents that can help you grow your business
        </h4>
      </div>
      <FindTalents
        talentsRes={talentsRes}
        roles={roles}
        disableScheduleMeeting={!canScheduleMeeting}
        searchParams={resolvedSearchParams}
      />
      <DisplayErrorMessages errors={errors} />
    </>
  );
};

export default FindTalentsPage;
