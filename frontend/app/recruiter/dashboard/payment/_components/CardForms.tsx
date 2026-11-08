"use client";

import dynamic from "next/dynamic";

// Payment SDKs access browser globals while loading. Client components still
// participate in SSR, so the SDK imports must explicitly opt out of it.
export const AddPaystackCard = dynamic(() => import("./AddPaystackCard"), {
  ssr: false,
});

export const AddStripeCard = dynamic(() => import("./AddStripeCard"), {
  ssr: false,
});
