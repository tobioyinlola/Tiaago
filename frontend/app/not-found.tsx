import Link from "next/link";

import Navbar from "./common/components/Layout/Navbar";
import GoBackButton from "./common/components/GoBackButton";
import EmptyState from "./common/components/dashboard/EmptyState";

export const metadata = {
  title: "Page not found",
};

const NotFound = () => (
  <div className='h-screen flex items-center justify-center gap-5 flex-col'>
    <div className='relative'>
      <Navbar hideAuthButtons />
    </div>
    <EmptyState text='Page not found' className='gap-3 pb-0 text-3xl' />
    <div className='flex items-center gap-3'>
      <GoBackButton />
      <Link className='btn btn-primary' href='/'>
        Go back home
      </Link>
    </div>
  </div>
);

export default NotFound;
