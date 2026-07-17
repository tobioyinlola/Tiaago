"use client";

import { AlertTriangle } from "lucide-react";

import BrandLink from "@/app/common/components/BrandLink";

const TerminatedPage = () => {
  return (
    <div className='min-h-screen w-full bg-white flex flex-col'>
      <header className='w-full px-6 md:px-10 py-5'>
        <BrandLink containerClassName='block w-fit' />
      </header>

      <div className='flex-1 flex items-center justify-center px-6 py-16'>
        <div className='max-w-lg w-full text-center'>
          <div className='mx-auto w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-6'>
            <AlertTriangle className='h-8 w-8 text-error' />
          </div>
          <h1 className='text-2xl md:text-3xl font-bold text-primary-black mb-3'>
            Your assessment has been submitted due to multiple integrity violations.
          </h1>
          <p className='text-secondary-black'>
            The recruiter will review your results. If you have any questions, please reply to the invitation
            email you received.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TerminatedPage;
