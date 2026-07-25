import { isSameMonth } from "date-fns";
import { notFound } from "next/navigation";

import JobApplicationGrid, {
  JobApplicationsTable,
} from "@/app/recruiter/dashboard/components/JobApplicationGrid";

import { getSchedule } from "@/app/common/services/schedule";
import { getCurrentUser } from "@/app/common/services/profile";
import { getAiFeedback } from "@/app/common/services/assessment";
import UpdateJobStatus from "../../../_components/UpdateJobStatus";
import { getJob, getJobApplications } from "@/app/common/services/jobs";
import PostJobBtn from "@/app/recruiter/dashboard/components/PostJobBtn";
import { FREE_RECRUITER_MAX_MEETINGS_PER_MONTH } from "@/app/common/constants";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";
import ServerPagination from "@/app/common/components/ServerPagination";
import { ISearchParams } from "@/app/common/types";

export const metadata = {
  title: "View Talent Applications",
};

const ViewTalentApplicationsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{
    job_id?: string;
  }>;
  searchParams: Promise<ISearchParams>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const { job_id } = await params;
  if (typeof job_id !== "string") return notFound();
  const resolvedSearchParams = await searchParams;
  const _page = resolvedSearchParams.page
    ? parseInt(resolvedSearchParams.page as string)
    : 1;
  const page = isNaN(_page) ? 1 : _page;

  const job = await getJob(job_id).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get job error (view talent applications): ", error);
    errors.push({
      message: error,
      title: "Error getting job",
    });
    return null;
  });
  if (!job) return notFound();

  const [resolvedUser, jobApplicationsRes, aiFeedbackRes] = await Promise.all([
    getCurrentUser("recruiter").then(res => res.currentUser),
    getJobApplications().catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log(
        "Get job applications error (view talent applications): ",
        error
      );
      errors.push({
        message: error,
        title: "Error getting job applications",
      });
      return null;
    }),
    getAiFeedback(job_id, page).catch(async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get AI feedback error (view talent applications): ", error);
      errors.push({
        message: error,
        title: "Error getting AI feedback",
      });
      return null;
    }),
  ]);
  const currentUser = resolvedUser;
  const jobApplications = jobApplicationsRes?.results || [];
  const applications = jobApplications.filter(app => app.job.id === job.id);
  // const roles = await getTalentRoles().catch(async e => {
  //   const error = await handleServerApiCallError(e);
  //   console.log("Get talent roles error (view talent applications): ", error);
  //   errors.push({
  //     message: error,
  //     title: "Error getting talent roles",
  //   });
  //   return [];
  // });
  const aiFeedbacks = aiFeedbackRes?.results || [];
  const isApproved = currentUser.verified;

  const schedule = isApproved
    ? await getSchedule().catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get schedule error (view talent applications): ", error);
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
  const isHireWithAi = true;

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-8'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
            Applications
          </h1>
          <PostJobBtn />
        </div>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Kindly go through your applications for {job.title}
        </h4>
      </div>
      <UpdateJobStatus job={job} />
      {isHireWithAi ? (
        <>
          <JobApplicationsTable data={aiFeedbacks} />
          {!!aiFeedbackRes && (
            <ServerPagination
              pagedResource={aiFeedbackRes}
              searchParams={resolvedSearchParams}
            />
          )}
        </>
      ) : (
        <>
          <h4 className='text-[#101828] text-lg my-8 font-medium'>
            {applications.length} Job Applicant
            {applications.length !== 1 ? "s" : ""}
          </h4>
          <JobApplicationGrid
            applications={applications}
            currentUserType='CR'
            canScheduleMeeting={canScheduleMeeting}
          />
        </>
      )}
    </>
  );
};

export default ViewTalentApplicationsPage;
