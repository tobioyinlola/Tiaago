import Link from "next/link";

const PostJobBtn = () => (
  <Link
    href='/recruiter/dashboard/jobs/create'
    className='btn btn-primary font-medium text-base max-sm:btn-sm'
  >
    Post a Job
  </Link>
);

export default PostJobBtn;
