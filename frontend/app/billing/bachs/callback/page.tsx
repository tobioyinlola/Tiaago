import { Metadata } from "next";
import Link from "next/link";

import BrandLink from "@/app/common/components/BrandLink";
import { getWalletTopupStatus } from "@/app/common/services/subscription";
import BachsCallbackStatus from "./BachsCallbackStatus";

export const metadata: Metadata = {
  title: "Confirming your payment",
};

// The return_url Bachs redirects the recruiter back to after checkout (see
// FundWalletView's bachs branch, backend/subscriptions/views.py). This page
// only ever *reads* the top-up's status -- the wallet is credited solely by
// the collection.succeeded webhook (bachs_wallet_fund_webhook), never from
// here, per Bachs' "webhooks are the source of truth" rule.
const BachsCallbackPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ topup_id?: string; cancelled?: string }>;
}) => {
  const { topup_id: topupId, cancelled } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
      <BrandLink containerClassName="mb-8" />
      <div className="bg-white rounded-lg shadow-sm border p-8 w-full max-w-md">
        {cancelled === "true" ? (
          <div className="text-center">
            <h1 className="text-xl font-bold mb-2">Payment cancelled</h1>
            <p className="text-sm text-muted-foreground mb-6">
              You cancelled the payment -- your wallet has not been charged.
            </p>
            <Link href="/recruiter/dashboard/billing" className="btn btn-primary w-full">
              Back to billing
            </Link>
          </div>
        ) : !topupId ? (
          <div className="text-center">
            <h1 className="text-xl font-bold mb-2">Invalid payment link</h1>
            <p className="text-sm text-muted-foreground mb-6">
              This link is missing information we need to confirm your payment. If you completed a payment, check
              your wallet balance -- it may already be credited.
            </p>
            <Link href="/recruiter/dashboard/billing" className="btn btn-primary w-full">
              Go to billing
            </Link>
          </div>
        ) : (
          <BachsCallbackStatus topupId={topupId} initialStatus={await getWalletTopupStatus(topupId)} />
        )}
      </div>
    </div>
  );
};

export default BachsCallbackPage;
