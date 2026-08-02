import Link from "next/link";

/** Full page in place of the job details / apply form once a job's
 * job_status isn't ACTIVE (manually put on hold, expired, filled, or
 * auto-paused because the recruiter's wallet ran out) -- candidates only
 * ever see this generic message, never the underlying reason. Mirrors
 * GuestApplyForm's own min-h-screen centering so it reads the same on both
 * the job-detail and /apply routes. */
const JobClosedNotice = () => {
  return (
    <div className='min-h-screen w-full bg-gray-50 flex flex-col'>
      <div className='flex-1 flex items-center justify-center px-6 pt-28 pb-16'>
        <div className='max-w-md w-full text-center'>
          <h1 className='text-2xl font-bold text-gray-900 mb-3'>
            This job is no longer accepting applications
          </h1>
          <p className='text-base text-gray-600 mb-8'>
            This role has been closed by the employer. Check back later or browse other open
            positions.
          </p>
          <Link
            href='/talents/jobs/search'
            className='inline-block bg-primary text-white py-3 px-8 rounded-full font-semibold hover:bg-primary-dark transition-colors'
          >
            Browse Open Jobs
          </Link>
        </div>
      </div>
    </div>
  );
};

export default JobClosedNotice;
