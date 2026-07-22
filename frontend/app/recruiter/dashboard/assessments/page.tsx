import Link from "next/link";
import { ClipboardList, CheckCircle2, Activity, Timer, Plus } from "lucide-react";

import StatCard from "./_components/StatCard";
import AssessmentCard from "./_components/AssessmentCard";
import { getAssessmentDurationInMinutes } from "@/app/common/utils";
import { getCompanyAssessments } from "@/app/common/services/assessment";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

export const metadata = {
  title: "Assessment",
};

const AssessementsPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const { count, results } = await getCompanyAssessments().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get company assessments error (assessments page): ", error);
    errors.push({
      message: error,
      title: "Error getting company assessments",
    });
    return { count: 0, results: [] };
  });

  const publishedCount = results.filter(a => a.published).length;
  const draftCount = results.length - publishedCount;

  const getAverageTime = () => {
    const totalMinutes = results.reduce(
      (acc, curr) => acc + (getAssessmentDurationInMinutes(curr) || 0),
      0
    );
    const avg = results.length ? totalMinutes / results.length : 0;
    const minutes = Math.abs(Math.floor(avg));
    const seconds = Math.abs(Math.round((avg - minutes) * 60));
    return `${minutes}m ${seconds}s`;
  };

  const stats = [
    { title: "Total assessments", value: count, icon: ClipboardList, tone: "primary" as const },
    { title: "Published", value: publishedCount, icon: CheckCircle2, tone: "success" as const },
    { title: "Drafts", value: draftCount, icon: Activity, tone: "info" as const },
    { title: "Average duration", value: getAverageTime(), icon: Timer, tone: "warning" as const },
  ];

  return (
    <div className='text-black'>
      <DisplayErrorMessages errors={errors} />
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-2xl font-semibold font-space-grotesk text-primaryBlack'>Assessments</h1>
          <p className='text-secondary-black text-sm mt-1'>
            Create, publish and track skill assessments for your candidates.
          </p>
        </div>
        <Link
          href='/recruiter/dashboard/assessments/add'
          className='btn btn-primary text-white gap-2 rounded-lg'
        >
          <Plus className='w-4 h-4' />
          New Assessment
        </Link>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        {stats.map((stat, index) => (
          <StatCard key={index} title={stat.title} value={stat.value} icon={stat.icon} tone={stat.tone} />
        ))}
      </div>

      <div className='bg-white rounded-2lg p-6 border border-[#EAECF0]'>
        <div className='mb-6'>
          <h2 className='text-xl font-semibold font-space-grotesk text-primaryBlack'>Skill Assessments</h2>
          <p className='text-secondary-black text-sm'>Add, edit, duplicate and archive assessments.</p>
        </div>

        {results.length === 0 ? (
          <Link
            href='/recruiter/dashboard/assessments/add'
            className='border-2 border-dashed border-[#D0D5DD] rounded-2lg py-16 flex flex-col items-center justify-center text-secondary-black hover:border-primary hover:bg-primary/[0.02] transition-colors'
          >
            <div className='w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4'>
              <Plus className='text-2xl text-primary' />
            </div>
            <p className='font-medium text-primaryBlack'>Create your first assessment</p>
            <p className='text-sm mt-1'>Build a skill assessment to start screening candidates</p>
          </Link>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            <Link
              href='/recruiter/dashboard/assessments/add'
              className='border-2 border-dashed border-[#D0D5DD] rounded-2lg p-6 flex flex-col items-center justify-center text-secondary-black cursor-pointer hover:border-primary hover:bg-primary/[0.02] transition-colors min-h-[220px]'
            >
              <div className='w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4'>
                <Plus className='text-2xl text-primary' />
              </div>
              <p className='font-medium text-primaryBlack'>Add Assessment</p>
              <p className='text-sm text-center mt-1'>Click to build a new assessment</p>
            </Link>

            {results.map((assessment, index) => (
              <AssessmentCard key={index} {...assessment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessementsPage;
