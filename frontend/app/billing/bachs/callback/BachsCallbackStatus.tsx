"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { WalletTopupStatus } from "@/app/common/services/subscription";

const POLL_INTERVAL_MS = 3000;
const SLOW_AFTER_MS = 2 * 60 * 1000;

const currencySymbol = (currency: string) => (currency === "NGN" ? "₦" : "$");

const BachsCallbackStatus = ({
  topupId,
  initialStatus,
}: {
  topupId: string;
  initialStatus: WalletTopupStatus | null;
}) => {
  const [topup, setTopup] = useState<WalletTopupStatus | null>(initialStatus);
  const [slow, setSlow] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!topup || topup.status !== "pending") return;
    if (startedAtRef.current === null) startedAtRef.current = Date.now();

    const interval = setInterval(async () => {
      try {
        const data = await clientKyInstance.get(`subscriptions/topup/${topupId}/status/`).json<WalletTopupStatus>();
        setTopup(data);
      } catch {
        // Transient errors are fine -- just try again next tick.
      }
      if (startedAtRef.current !== null && Date.now() - startedAtRef.current > SLOW_AFTER_MS) setSlow(true);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [topup, topupId]);

  if (!topup) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold mb-2">We couldn&apos;t find that payment</h1>
        <p className="text-sm text-muted-foreground mb-6">
          If you completed a payment, check your wallet balance -- it may already be credited.
        </p>
        <Link href="/recruiter/dashboard/billing" className="btn btn-primary w-full">
          Go to billing
        </Link>
      </div>
    );
  }

  if (topup.status === "completed") {
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold mb-2">Payment successful</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {currencySymbol(topup.currency)}
          {topup.amount} has been added to your wallet.
        </p>
        <Link href="/recruiter/dashboard/billing" className="btn btn-primary w-full">
          Go to billing dashboard
        </Link>
      </div>
    );
  }

  if (topup.status === "failed") {
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold mb-2">Payment could not be confirmed</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {topup.failure_reason || "Please try again or contact support."}
        </p>
        <Link href="/recruiter/dashboard/billing" className="btn btn-primary w-full">
          Back to billing
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1 className="text-xl font-bold mb-2">Your payment is being confirmed...</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {slow
          ? "This is taking longer than usual. Your wallet will be credited automatically once confirmed. Check your balance shortly."
          : "This usually takes a few seconds. Hang tight."}
      </p>
      <Link href="/recruiter/dashboard/billing" className="btn btn-outline w-full">
        Go to billing dashboard
      </Link>
    </div>
  );
};

export default BachsCallbackStatus;
