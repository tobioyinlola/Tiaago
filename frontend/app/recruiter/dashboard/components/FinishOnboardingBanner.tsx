"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";

const DISMISS_KEY = "tiaago-finish-onboarding-banner-dismissed";

const subscribe = () => () => {};
const getDismissedSnapshot = () =>
  sessionStorage.getItem(DISMISS_KEY) === "true";
// Hidden during SSR; appears after hydration when not dismissed.
const getServerSnapshot = () => true;

/**
 * Shown to recruiters that skipped the onboarding cards, until they finish.
 * Dismissing hides it for the rest of the browser session.
 */
const FinishOnboardingBanner = () => {
  const initiallyDismissed = useSyncExternalStore(
    subscribe,
    getDismissedSnapshot,
    getServerSnapshot
  );
  const [dismissed, setDismissed] = useState(false);

  if (initiallyDismissed || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  return (
    <div className='mb-8 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 animate-fade-in'>
      <div className='h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center max-sm:hidden'>
        <Sparkles className='h-5 w-5 text-primary' aria-hidden />
      </div>
      <div className='flex-1 min-w-0'>
        <p className='font-medium text-sm'>Finish setting up your workspace</p>
        <p className='text-sm text-muted-foreground'>
          A few quick questions help us tailor Tiaago to your hiring.
        </p>
      </div>
      <Link
        href='/recruiter/onboarding'
        className='btn btn-primary btn-sm gap-2 text-white shrink-0'
      >
        Finish setup <ArrowRight className='h-4 w-4' aria-hidden />
      </Link>
      <button
        type='button'
        onClick={dismiss}
        aria-label='Dismiss finish setup banner'
        className='shrink-0 rounded-md p-2.5 text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      >
        <X className='h-4 w-4' aria-hidden />
      </button>
    </div>
  );
};

export default FinishOnboardingBanner;
