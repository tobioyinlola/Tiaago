import { Metadata } from "next";

import BrandLink from "@/app/common/components/BrandLink";
import { lookupUnsubscribeToken } from "@/app/common/services/unsubscribe";
import UnsubscribeConfirm from "./UnsubscribeConfirm";

export const metadata: Metadata = {
  title: "Unsubscribe",
};

const UnsubscribePage = async ({ searchParams }: { searchParams: Promise<{ token?: string }> }) => {
  const { token } = await searchParams;

  const lookup = token ? await lookupUnsubscribeToken(token) : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
      <BrandLink containerClassName="mb-8" />
      <div className="bg-white rounded-lg shadow-sm border p-8 w-full max-w-md">
        {!token || !lookup?.success ? (
          <div className="text-center">
            <h1 className="text-xl font-bold mb-2">Invalid unsubscribe link</h1>
            <p className="text-sm text-muted-foreground">
              This link is missing or no longer valid. If you keep getting unwanted emails, contact support@tiaago.com.
            </p>
          </div>
        ) : (
          <UnsubscribeConfirm token={token} email={lookup.data.email} campaignName={lookup.data.campaign_name} />
        )}
      </div>
    </div>
  );
};

export default UnsubscribePage;
