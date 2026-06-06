"use client";

import { cn } from "./common/utils";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        className={cn(
          "min-h-[100svh] min-w-[100svw] scroll-smooth bg-[#F7F7FB] text-black flex flex-col items-center justify-center p-8"
        )}
      >
        <h2 className='text-2xl font-semibold'>Something went wrong!</h2>
        <p className='text-lg font-normal'>
          {error.message || "An error occurred"}
        </p>
        {!!error.digest && (
          <p className='text-sm'>Error digest: {error.digest}</p>
        )}
        <button className='btn btn-primary' onClick={() => reset()}>
          Try again
        </button>
        {/* or refresh */}
        <h6 className='text-base font-semibold mt-4'>Or</h6>
        <button
          className='btn btn-neutral'
          onClick={() => window?.location.reload()}
        >
          Refresh
        </button>
        <h6 className='text-sm font-normal mt-4'>
          If the problem persists, please contact support.
        </h6>
      </body>
    </html>
  );
}
