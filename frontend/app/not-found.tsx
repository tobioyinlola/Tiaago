import Link from "next/link";
import Image from "next/image";
import { Compass } from "lucide-react";

import Navbar from "./common/components/Layout/Navbar";
import GoBackButton from "./common/components/GoBackButton";

export const metadata = {
  title: "Page not found",
};

const NotFound = () => (
  <div className='relative min-h-screen overflow-hidden bg-[radial-gradient(100%_100%_at_50%_0%,#FFFFFF_70%,#EEEFFF_100%)]'>
    <Image
      src='/assets/images/Pricing Background pattern.png'
      alt=''
      className='object-cover'
      fill
    />
    <Navbar hideAuthButtons />

    <div className='relative min-h-screen flex flex-col items-center justify-center text-center px-4'>
      <div className='w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6'>
        <Compass className='w-8 h-8 text-primary' />
      </div>

      <span className='font-space-grotesk font-bold text-[100px] md:text-[140px] leading-none bg-gradient-to-br from-primary to-[#8A43E1] bg-clip-text text-transparent'>
        404
      </span>

      <h1 className='text-2xl md:text-3xl font-bold font-space-grotesk text-primary-black mt-2 mb-3'>
        This page took a wrong turn
      </h1>
      <p className='text-secondary-black max-w-md mb-8'>
        The page you&apos;re looking for doesn&apos;t exist, or may have moved. Let&apos;s get you back on track.
      </p>

      <div className='flex items-center gap-3'>
        <GoBackButton className='!rounded-full' />
        <Link className='btn btn-primary text-white !rounded-full' href='/'>
          Go back home
        </Link>
      </div>
    </div>
  </div>
);

export default NotFound;
