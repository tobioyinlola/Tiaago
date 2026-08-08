"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Gift, TriangleAlert, X } from "lucide-react";

const subscribe = () => () => {};
// Hidden during SSR; appears after hydration when not dismissed.
const getServerSnapshot = () => true;

/**
 * Tells a recruiter how many of their free credits (resume screening +
 * assessment, one credit each) are left, and switches to a "fund your
 * wallet" warning once they're gone -- see subscriptions.billing_service's
 * free-credit/wallet-exhaustion flow, which is what actually pauses jobs
 * once the wallet itself runs dry. Dismissing hides that specific variant
 * for the rest of the browser session; if it later switches variants
 * (credits run out), it reappears once until dismissed again.
 */
const FreeCreditsBanner = ({
  freeCreditsRemaining,
  freeTierLimit,
}: {
  freeCreditsRemaining: number | null;
  freeTierLimit: number;
}) => {
  const exhausted = freeCreditsRemaining === 0;
  const dismissKey = exhausted
    ? "tiaago-credits-exhausted-banner-dismissed"
    : "tiaago-free-credits-banner-dismissed";

  const initiallyDismissed = useSyncExternalStore(
    subscribe,
    () => sessionStorage.getItem(dismissKey) === "true",
    getServerSnapshot
  );
  const [dismissed, setDismissed] = useState(false);

  if (freeCreditsRemaining === null) return null;
  if (initiallyDismissed || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(dismissKey, "true");
    setDismissed(true);
  };

  return (
    <div
      className={
        exhausted
          ? "mb-8 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 animate-fade-in"
          : "mb-8 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 animate-fade-in"
      }
    >
      <div
        className={
          exhausted
            ? "h-10 w-10 shrink-0 rounded-xl bg-amber-100 flex items-center justify-center max-sm:hidden"
            : "h-10 w-10 shrink-0 rounded-xl bg-emerald-100 flex items-center justify-center max-sm:hidden"
        }
      >
        {exhausted ? (
          <TriangleAlert className='h-5 w-5 text-amber-600' aria-hidden />
        ) : (
          <Gift className='h-5 w-5 text-emerald-600' aria-hidden />
        )}
      </div>
      <div className='flex-1 min-w-0'>
        {exhausted ? (
          <>
            <p className='font-medium text-sm text-amber-900'>
              You&apos;ve used all {freeTierLimit} free credits
            </p>
            <p className='text-sm text-amber-800'>
              Fund your wallet to keep screening and assessing candidates -- otherwise your job
              listings will be paused once billing is due.
            </p>
          </>
        ) : (
          <>
            <p className='font-medium text-sm'>
              {freeCreditsRemaining} of {freeTierLimit} free credits remaining
            </p>
            <p className='text-sm text-muted-foreground'>
              Use these to test out Tiaago and verify candidates -- every resume screening or
              assessment uses one credit until they run out.
            </p>
          </>
        )}
      </div>
      {exhausted && (
        <Link
          href='/recruiter/dashboard/billing'
          className='btn btn-sm gap-2 text-white shrink-0 bg-amber-600 hover:bg-amber-700 border-none'
        >
          Fund wallet
        </Link>
      )}
      <button
        type='button'
        onClick={dismiss}
        aria-label={exhausted ? "Dismiss credits-exhausted banner" : "Dismiss free-credits banner"}
        className='shrink-0 rounded-md p-2.5 text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      >
        <X className='h-4 w-4' aria-hidden />
      </button>
    </div>
  );
};

export default FreeCreditsBanner;
