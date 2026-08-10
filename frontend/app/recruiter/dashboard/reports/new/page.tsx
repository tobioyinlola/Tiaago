import { getJobs } from "@/app/common/services/jobs";
import ReportWizard from "./_components/ReportWizard";

export const metadata = {
  title: "Generate Report",
};

const NewReportPage = async () => {
  const jobsRes = await getJobs(1, 500).catch(() => null);
  const jobs = jobsRes?.results ?? [];

  return (
    <div className='text-black'>
      <div className='mb-6'>
        <h1 className='text-2xl font-semibold font-space-grotesk text-primaryBlack'>Generate Report</h1>
        <p className='text-secondary-black text-sm mt-1'>
          Build a hiring performance report from your pipeline data.
        </p>
      </div>
      <ReportWizard jobs={jobs} />
    </div>
  );
};

export default NewReportPage;
