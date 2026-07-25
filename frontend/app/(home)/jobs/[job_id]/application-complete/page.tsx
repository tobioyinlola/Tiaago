import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicJob } from "@/app/common/services/jobs";
import { SuccessIconWithConfetti } from "@/app/common/icons/SuccessIcon";

export const metadata = {
  title: "Application Complete",
};

const JobApplicationCompletePage = async ({
  params,
}: {
  params: Promise<{ job_id: string }>;
}) => {
  const resolvedParams = await params;
  const { job_id } = resolvedParams;

  // Verify the job exists
  const job = await getPublicJob(job_id).catch(() => null);
  if (!job) return notFound();

  return (
    <div className='flex items-center justify-center bg-gray-50'>
      <div className='max-w-2xl mx-auto text-center mt-10'>
        <div className='flex justify-center w-full'>
          <SuccessIconWithConfetti />
        </div>

        <h1 className='text-3xl font-bold text-gray-900 mt-6 mb-4'>
          Application Complete!
        </h1>

        <p className='text-lg text-gray-600 mb-6'>
          Thank you for completing the assessment for the{" "}
          <strong>{job.title}</strong> position at{" "}
          <strong>{job.company?.company_name}</strong>.
        </p>

        <div className='bg-green-50 border border-green-200 rounded-lg p-6 mb-8'>
          <h2 className='text-xl font-semibold text-green-900 mb-3'>
            What happens next?
          </h2>
          <ul className='text-left text-green-800 space-y-2'>
            <li>
              • Your application and assessment results have been submitted
            </li>
            <li>• The employer will review your application</li>
            <li>• You&apos;ll be notified of any updates via email</li>
            <li>• Check your applications dashboard for status updates</li>
          </ul>
        </div>

        <div className='space-y-4'>
          <Link
            href='/talents/applications'
            className='inline-block bg-primary text-white py-3 px-8 rounded-lg font-semibold hover:bg-primary-dark transition-colors'
          >
            View My Applications
          </Link>

          <div>
            <Link
              href='/talents/jobs/search'
              className='text-blue-600 hover:text-blue-800 font-medium'
            >
              Browse More Jobs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobApplicationCompletePage;
