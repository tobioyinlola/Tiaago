import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";
import ServerPagination from "@/app/common/components/ServerPagination";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";
import { ISearchParams, RecruiterInterviewTab } from "@/app/common/types";
import { getRecruiterInterviews } from "@/app/common/services/interviews";
import InterviewCard from "./_components/InterviewCard";
import InterviewTabs from "./_components/InterviewTabs";
import {
  emptyStateSubText,
  emptyStateText,
  parseInterviewTab,
} from "./interviews.constants";

export const metadata = {
  title: "Interviews",
};

const InterviewsPage = async ({
  searchParams,
}: {
  searchParams: Promise<ISearchParams>;
}) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const tab: RecruiterInterviewTab = parseInterviewTab(
    resolvedSearchParams.tab
  );
  const _page = resolvedSearchParams.page
    ? parseInt(resolvedSearchParams.page as string)
    : 1;
  const page = isNaN(_page) ? 1 : _page;

  const interviewsRes = await getRecruiterInterviews(tab, page).catch(
    async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get recruiter interviews error (interviews page): ", error);
      errors.push({
        message: error,
        title: "Error getting interviews",
      });
      return null;
    }
  );

  const results = interviewsRes?.results ?? [];
  const tabCounts = interviewsRes?.tab_counts;

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='p-8 max-md:px-1 flex flex-col gap-6 sm:gap-8 dashboard-content-constraint'>
        <div className='border-b border-gray-200 pb-1'>
          <h1 className='text-2xl font-space-grotesk font-semibold mb-1'>
            Interviews
          </h1>
          <p className='text-gray-900 text-base'>
            Prepare for, run and review every interview on your pipeline
          </p>
        </div>

        <div className='flex flex-col gap-6'>
          <InterviewTabs active={tab} counts={tabCounts} />

          {results.length === 0 ? (
            <EmptyStateV3
              text={emptyStateText[tab]}
              subText={emptyStateSubText[tab]}
            />
          ) : (
            <div className='flex flex-col gap-4'>
              {results.map(interview => (
                <InterviewCard
                  key={interview.id}
                  interview={interview}
                  tab={tab}
                />
              ))}
            </div>
          )}

          {!!interviewsRes && (
            <ServerPagination
              // This endpoint paginates with DRF's own paginator, which omits
              // the `current` field ServerPagination displays -- the requested
              // page number is the same thing.
              pagedResource={{
                ...interviewsRes,
                current: interviewsRes.current ?? page,
              }}
              searchParams={resolvedSearchParams}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default InterviewsPage;
