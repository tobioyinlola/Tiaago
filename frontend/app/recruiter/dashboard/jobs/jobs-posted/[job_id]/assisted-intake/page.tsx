import Link from "next/link";
import { notFound } from "next/navigation";

import { getJob } from "@/app/common/services/jobs";
import AssistedIntakeForm from "./_components/AssistedIntakeForm";

export const metadata = { title: "Enter an application" };

const AssistedIntakePage = async ({ params }: { params: Promise<{ job_id?: string }> }) => {
  const { job_id } = await params;
  if (typeof job_id !== "string") return notFound();
  const job = await getJob(job_id).catch(() => undefined);
  if (!job) return notFound();

  const enabled = !!job.application_configuration?.intake?.assisted;
  return <div className='dashboard-content-constraint flex flex-col gap-6 p-8 max-md:px-1'>
    <div>
      <Link href={`/recruiter/dashboard/jobs/jobs-posted/${job_id}/applications`} className='text-sm text-primary underline'>← Back to applications</Link>
      <h1 className='mt-2 font-space-grotesk text-2xl font-semibold'>Enter an application for a phone or walk-in candidate</h1>
      <p className='mt-1 text-secondary-black'>{job.title}</p>
    </div>
    {enabled
      ? <AssistedIntakeForm job={job} />
      : <p className='rounded-lg bg-[#FFFAEB] p-4 text-sm text-[#B54708]'>Assisted intake is not turned on for this job. Enable &ldquo;Let my team enter applications for phone or walk-in candidates&rdquo; in the job&apos;s application settings first.</p>}
  </div>;
};

export default AssistedIntakePage;
