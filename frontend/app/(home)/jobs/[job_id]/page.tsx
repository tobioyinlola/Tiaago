import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicJob } from "@/app/common/services/jobs";
import JobDetails from "@/app/common/components/dashboard/JobDetails";

type Props = { params: Promise<{ job_id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { job_id } = await params;
  const job = await getPublicJob(job_id).catch(() => null);
  if (!job) return { title: "Job Details" };
  const title = `${job.title} at ${job.company?.company_name || "TIAAGO"}`;
  const description = `Apply for ${job.title}${job.location ? ` in ${job.location}` : ""} on TIAAGO.`;
  return {
    title,
    description,
    openGraph: { title, description, siteName: "TIAAGO", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

const JobDetailsPage = async ({ params }: { params: Promise<{ job_id: string }> }) => {
  //   const { currentUser } = await getCurrentUser(undefined, {
  //     allowNull: true,
  //   });
  const resolvedParams = await params;
  const job = await getPublicJob(resolvedParams.job_id).catch(() => null);
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
          <Link
            href={job.get_apply_url || "#"}
            className='btn btn-primary text-white min-w-[156px] rounded-lg min-h-11 h-11 font-inter'
          >
            Apply
          </Link>
        </div>
      </div>
    </main>
  );
};

export default JobDetailsPage;
