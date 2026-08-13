import { Calculator, Mic } from "lucide-react";

import { PublicPricingConfig } from "@/app/common/services/pricing";

export interface PricingTier {
  name: string;
  pricePerUnit: number;
  /** Real NGN price from the backend's PricingConfig -- NOT derived from
   * pricePerUnit * currencyRates.NGN. The backend sets round local-currency
   * prices independently of the USD rate (see subscriptions.PricingConfig:
   * resume_screening_ngn=50, assessment_ngn=100), so deriving NGN via the
   * FX rate would show the wrong number. EUR/GBP have no backend pricing
   * config yet, so those still fall back to the rate-derived estimate. */
  pricePerUnitNGN: number;
  icon: React.ReactNode;
  description: string;
}

export type Currency = "USD" | "EUR" | "GBP" | "NGN";

export const FREE_TIER_LIMIT = 20;

export const currencyRates = {
  USD: 1,
  EUR: 0.92, // 1 USD = 0.92 EUR
  GBP: 0.79, // 1 USD = 0.79 GBP
  NGN: 1600, // 1 USD = 1600 NGN -- illustrative only, not used for tiers that
  // have a real backend NGN price (see pricePerUnitNGN); kept for any
  // currency math that still needs a rough USD->NGN estimate (EUR/GBP, and
  // deriving a USD/EUR/GBP estimate for the NGN-only AI interview price).
};

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return value !== undefined && !Number.isNaN(parsed) ? parsed : fallback;
};

/** Builds the calculator's tiers from the live, admin-editable PricingConfig
 * (see subscriptions.PricingConfigView "public" endpoint) instead of
 * hardcoding numbers that silently drift from whatever's actually charged.
 * Falls back to these defaults per-field if a key is missing/the fetch
 * failed, so the page never breaks. AI interview has no backend USD price
 * (flat NGN regardless of wallet currency, per BillingService.charge_ai_interview)
 * -- its USD/EUR/GBP figures are a rate-derived estimate off the NGN price,
 * same as EUR/GBP already are for the other tiers. */
export const buildPricingTiers = (pricing: PublicPricingConfig): PricingTier[] => {
  const aiInterviewNgn = num(pricing.ai_interview_price_ngn, 800);
  return [
    {
      name: "Resume Screening",
      pricePerUnit: num(pricing.resume_screening_usd, 0.03),
      pricePerUnitNGN: num(pricing.resume_screening_ngn, 50),
      icon: <Calculator className='w-5 h-5' />,
      description: "AI-powered resume analysis with 95% accuracy",
    },
    {
      name: "Assessment",
      pricePerUnit: num(pricing.assessment_usd, 0.07),
      pricePerUnitNGN: num(pricing.assessment_ngn, 100),
      icon: <Calculator className='w-5 h-5' />,
      description: "Technical or non-technical skill assessment, auto-generated from the job description",
    },
    {
      name: "AI Interview",
      pricePerUnit: Math.round((aiInterviewNgn / currencyRates.NGN) * 100) / 100,
      pricePerUnitNGN: aiInterviewNgn,
      icon: <Mic className='w-5 h-5' />,
      description: "Live AI voice interview with real-time scoring -- first 3 per organisation are free",
    },
  ];
};

/** Static fallback for any caller that can't fetch live pricing (e.g. a
 * client component with no server-side data-fetching path of its own) --
 * kept in sync manually, same numbers buildPricingTiers falls back to. */
export const pricingTiers: PricingTier[] = buildPricingTiers({});

export const currencySymbols = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
};
