import { Calculator } from "lucide-react";

export interface PricingTier {
  name: string;
  pricePerUnit: number;
  /** Real NGN price from the backend's PricingConfig -- NOT derived from
   * pricePerUnit * currencyRates.NGN. The backend sets round local-currency
   * prices independently of the USD rate (see subscriptions.PricingConfig:
   * resume_screening_ngn=40, assessment_ngn=100), so deriving NGN via the
   * FX rate would show the wrong number. EUR/GBP have no backend pricing
   * config yet, so those still fall back to the rate-derived estimate. */
  pricePerUnitNGN: number;
  icon: React.ReactNode;
  description: string;
}

export type Currency = "USD" | "EUR" | "GBP" | "NGN";

export const FREE_TIER_LIMIT = 20;

export const pricingTiers: PricingTier[] = [
  {
    name: "Resume Screening",
    pricePerUnit: 0.03,
    pricePerUnitNGN: 40,
    icon: <Calculator className='w-5 h-5' />,
    description: "AI-powered resume analysis with 95% accuracy",
  },
  {
    name: "Assessment",
    pricePerUnit: 0.07,
    pricePerUnitNGN: 100,
    icon: <Calculator className='w-5 h-5' />,
    description: "Technical or non-technical skill assessment, auto-generated from the job description",
  },
  // {
  //   name: "Pre-screening Interview",
  //   pricePerUnit: 0.6,
  //   pricePerUnitNGN: 850,
  //   icon: <Calculator className='w-5 h-5' />,
  //   description: "AI-driven interview with Jane",
  // },
];

export const currencyRates = {
  USD: 1,
  EUR: 0.92, // 1 USD = 0.92 EUR
  GBP: 0.79, // 1 USD = 0.79 GBP
  NGN: 1600, // 1 USD = 1600 NGN -- illustrative only, not used for the two
  // real priced tiers above (see pricePerUnitNGN); kept for any currency
  // math that still needs a rough USD->NGN estimate.
};

export const currencySymbols = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
};
