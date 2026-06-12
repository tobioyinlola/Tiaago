"use client";

import { Button } from "react-daisyui";

const OnboardingError = ({ reset }: { error: Error; reset: () => void }) => (
  <div className='min-h-[100svh] bg-background flex items-center justify-center p-4'>
    <div className='w-full max-w-md rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 text-center space-y-4'>
      <h1 className='text-xl font-bold'>Something went wrong</h1>
      <p className='text-sm text-muted-foreground'>
        We couldn&apos;t load your onboarding. Please try again.
      </p>
      <Button color='primary' className='text-white' onClick={reset}>
        Try again
      </Button>
    </div>
  </div>
);

export default OnboardingError;
