"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Gift, TriangleAlert, X } from "lucide-react";

const subscribe = () => () => {};
// Hidden during SSR; appears after hydration when not dismissed.
const getServerSnapshot = () => true;

type Variant = "credits" | "no_funds" | "low_balance";

/**
 * Tells a recruiter how many of their free credits (resume screening +
 * assessment, one credit each) are left, then switches to a wallet warning
 * once they're gone -- either "no funds at all" or "balance is running low"
 * -- see subscriptions.billing_service's free-credit/wallet-exhaustion flow,
 * which is what actually pauses jobs once the wallet itself runs dry.
 * Dismissing hides that specific variant for the rest of the browser
 * session; if it later switches variants, it reappears once until dismissed
 * again.
 */
const FreeCreditsBanner = ({
  freeCreditsRemaining,
  freeTierLimit,
  walletBalance,
  lowBalanceThreshold,
}: {
  freeCreditsRemaining: number | null;
  freeTierLimit: number;
  walletBalance: number | null;
  // Recruiter-configured (subscriptions.Wallet.low_balance_threshold), or
  // the currency's minimum-topup amount as a sane default when they've
  // never set one -- see layout.tsx.
  lowBalanceThreshold: number | null;
}) => {
  let variant: Variant | null = null;
  if (freeCreditsRemaining !== null && walletBalance !== null) {
    if (freeCreditsRemaining > 0) variant = "credits";
    else if (walletBalance <= 0) variant = "no_funds";
    else if (lowBalanceThreshold !== null && walletBalance < lowBalanceThreshold) variant = "low_balance";
  }

  const dismissKey = `tiaago-${variant}-banner-dismissed`;

  const initiallyDismissed = useSyncExternalStore(
    subscribe,
    () => (variant ? sessionStorage.getItem(dismissKey) === "true" : true),
    getServerSnapshot
  );
  const [dismissed, setDismissed] = useState(false);

  if (!variant) return null;
  if (initiallyDismissed || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(dismissKey, "true");
    setDismissed(true);
  };

  const isWarning = variant !== "credits";

  return (
    <div
      className={
        isWarning
          ? "mb-8 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 animate-fade-in"
          : "mb-8 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 animate-fade-in"
      }
    >
      <div
        className={
          isWarning
            ? "h-10 w-10 shrink-0 rounded-xl bg-amber-100 flex items-center justify-center max-sm:hidden"
            : "h-10 w-10 shrink-0 rounded-xl bg-emerald-100 flex items-center justify-center max-sm:hidden"
        }
      >
        {isWarning ? (
          <TriangleAlert className='h-5 w-5 text-amber-600' aria-hidden />
        ) : (
          <Gift className='h-5 w-5 text-emerald-600' aria-hidden />
        )}
      </div>
      <div className='flex-1 min-w-0'>
        {variant === "no_funds" && (
          <>
            <p className='font-medium text-sm text-amber-900'>
              You&apos;ve used all {freeTierLimit} free credits
            </p>
            <p className='text-sm text-amber-800'>
              Fund your wallet to keep screening and assessing candidates -- otherwise your job
              listings will be paused once billing is due.
            </p>
          </>
        )}
        {variant === "low_balance" && (
          <>
            <p className='font-medium text-sm text-amber-900'>
              Your wallet balance is running low
            </p>
            <p className='text-sm text-amber-800'>
              Top up soon to avoid interruptions -- your job listings will be paused if the
              balance runs out before your next top-up.
            </p>
          </>
        )}
        {variant === "credits" && (
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
      {isWarning && (
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
        aria-label={isWarning ? "Dismiss wallet warning banner" : "Dismiss free-credits banner"}
        className='shrink-0 rounded-md p-2.5 text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      >
        <X className='h-4 w-4' aria-hidden />
      </button>
    </div>
  );
};

export default FreeCreditsBanner;
