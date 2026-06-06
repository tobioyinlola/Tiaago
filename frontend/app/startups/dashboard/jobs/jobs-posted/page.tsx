import { ExternalLink, Users } from "lucide-react";

import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import { ISearchParams } from "@/app/common/types";
import PostJobBtn from "../../components/PostJobBtn";
import { getJobs } from "@/app/common/services/jobs";
import JobsPostedTable from "../_components/JobsPostedTable";
import { handleServerApiCallError } from "@/app/common/utils";
import ServerPagination from "@/app/common/components/ServerPagination";
import { BASE_URL } from "@/app/common/constants";
import { getCurrentUser } from "@/app/common/services/profile";
import CopyToClipboard from "@/app/common/components/CopyToClipboard";
import Link from "next/link";

export const metadata = {
  title: "Jobs Posted",
};

const JobsPostedPage = async ({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const currentUser = (await getCurrentUser("startup")).currentUser;
  const resolvedSearchParams = await searchParams;
  const _page = resolvedSearchParams.page
    ? parseInt(resolvedSearchParams.page as string)
    : 1;
  const page = isNaN(_page) ? 1 : _page;
  const jobsRes = await getJobs(page).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get jobs error (jobs posted): ", error);
    errors.push({
      message: error,
      title: "Error getting jobs",
    });
    return null;
  });
  const jobs = jobsRes?.results || [];
  // const filteredJobs = jobs.filter(job => job.company.id === currentUser!.id);

  const publicUrl = `${BASE_URL}/companies/${currentUser.company_name}`;
  return (
    <>
      <div className='border-b w-full border-gray-200 pb-1 mb-2'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>
            Jobs Posted
          </h1>
          <PostJobBtn />
        </div>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Kindly go through your jobs posted
        </h4>
      </div>
      <div className='bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6 mb-8 mt-2'>
        <div className='flex items-start gap-4'>
          <div className='w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0'>
            <Users size={24} className='text-indigo-600' />
          </div>
          <div className='flex-1'>
            <h3 className='text-lg font-bold text-gray-900 mb-2'>
              Your Public Job Board
            </h3>
            <p className='text-sm text-gray-700 mb-4'>
              Share this single URL to show all your active job postings.
              Candidates can browse and apply to any position.
            </p>
            <div className='flex items-center gap-3'>
              <div className='flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-700'>
                {publicUrl}
              </div>
              <CopyToClipboard
                className='flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors'
                text={publicUrl}
              >
                Copy Link
              </CopyToClipboard>
              <Link
                href={publicUrl}
                target='_blank'
                className='flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors'
              >
                <ExternalLink size={16} />
                Preview
              </Link>
            </div>
          </div>
        </div>
      </div>
      <JobsPostedTable jobs={jobs} />
      {!!jobsRes && (
        <ServerPagination
          pagedResource={jobsRes}
          searchParams={resolvedSearchParams}
        />
      )}
      <DisplayErrorMessages errors={errors} />
    </>
  );
};

export default JobsPostedPage;
