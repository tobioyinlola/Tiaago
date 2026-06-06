import { notFound } from "next/navigation";

import { getJob } from "@/app/common/services/jobs";
import JobDetails from "@/app/common/components/dashboard/JobDetails";
import JobApplicationModal from "@/app/talents/(dashboard)/(requires-verification)/jobs/components/JobApplicationModal";

export const metadata = {
  title: "Job Details",
};

const JobDetailsPage = async ({ params }: { params: Promise<{ job_id: string }> }) => {
  //   const { currentUser } = await getCurrentUser(undefined, {
  //     allowNull: true,
  //   });
  const resolvedParams = await params;
  const job = await getJob(resolvedParams.job_id).catch(() => null);
  if (!job) return notFound();
  return (
    <main className='p-5 pt-20'>
      <div className='px-4 md:px-6 py-[18px] rounded-t-xl bg-[#EBECEE] md:mx-16'>
        <h1 className='text-2xl font-semibold font-switzer text-[#101828]'>
          Job Post Summary
        </h1>
      </div>
      <div className='p-4 md:p-8 pb-10 rounded-b-2xl border border-[##EAECF0] md:mx-16'>
        <JobDetails job={job as any} />

        <div className='mt-11 flex justify-end'>
          <JobApplicationModal
            id={job.id}
            role={job.title}
            company={job.company?.company_name}
            buttonText='Apply'
            buttonClassName='btn-primary min-w-[156px] rounded-lg min-h-11 h-11 font-inter'
          />
        </div>
      </div>
    </main>
  );
};

export default JobDetailsPage;
