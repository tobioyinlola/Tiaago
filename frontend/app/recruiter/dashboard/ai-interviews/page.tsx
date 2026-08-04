import { Bot, CheckCircle2, Clock, UserX } from "lucide-react";

import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";
import DisplayErrorMessages, { DisplayErrorMessagesProps } from "@/app/common/components/DisplayErrorMessages";
import StatCard from "../assessments/_components/StatCard";
import { getRecruiterAIInterviews } from "@/app/common/services/ai-interviews";
import AIInterviewCard from "./_components/AIInterviewCard";
import AIInterviewTabs from "./_components/AIInterviewTabs";
import StartTestInterviewModal from "./_components/StartTestInterviewModal";
import { emptyStateSubText, emptyStateText, parseAIInterviewTab } from "./ai-interviews.constants";

export const metadata = {
  title: "AI Interviews",
};

const AIInterviewsPage = async ({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const resolvedSearchParams = await searchParams;
  const tab = parseAIInterviewTab(resolvedSearchParams.tab);

  const response = await getRecruiterAIInterviews(tab).catch(error => {
    errors.push({ message: error.message, title: "Error getting AI interviews" });
    return null;
  });

  const results = response?.results ?? [];
  const stats = response?.stats;

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='p-8 max-md:px-1 flex flex-col gap-6 sm:gap-8 dashboard-content-constraint'>
        <div className='border-b border-gray-200 pb-4 flex items-start justify-between gap-4 flex-wrap'>
          <div>
            <h1 className='text-2xl font-space-grotesk font-semibold mb-1'>AI Interviews</h1>
            <p className='text-gray-900 text-base'>
              Review AI-conducted interviews and decide who moves forward
            </p>
          </div>
          <StartTestInterviewModal />
        </div>

        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
          <StatCard title='Pending review' value={stats?.pending_review ?? 0} icon={Bot} tone='primary' />
          <StatCard title='Completed' value={stats?.completed ?? 0} icon={CheckCircle2} tone='success' />
          <StatCard title='Scheduled' value={stats?.scheduled ?? 0} icon={Clock} tone='info' />
          <StatCard title='No shows' value={stats?.no_shows ?? 0} icon={UserX} tone='warning' />
        </div>

        <div className='flex flex-col gap-6'>
          <AIInterviewTabs active={tab} counts={stats} />

          {results.length === 0 ? (
            <EmptyStateV3 text={emptyStateText[tab]} subText={emptyStateSubText[tab]} />
          ) : (
            <div className='flex flex-col gap-4'>
              {results.map(interview => (
                <AIInterviewCard key={interview.id} interview={interview} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AIInterviewsPage;
