import { Calculator } from "lucide-react";

export interface PricingTier {
  name: string;
  pricePerUnit: number;
  icon: React.ReactNode;
  description: string;
}

export type Currency = "USD" | "EUR" | "GBP" | "NGN";

export const pricingTiers: PricingTier[] = [
  {
    name: "Resume Screening",
    pricePerUnit: 0.03,
    icon: <Calculator className='w-5 h-5' />,
    description: "AI-powered resume analysis with 95% accuracy",
  },
  {
    name: "Non-Technical Assessment",
    pricePerUnit: 0.05,
    icon: <Calculator className='w-5 h-5' />,
    description: "Comprehensive soft skills evaluation",
  },
  {
    name: "Technical Assessment",
    pricePerUnit: 0.09,
    icon: <Calculator className='w-5 h-5' />,
    description: "In-depth technical skills verification",
  },
  // {
  //   name: "Pre-screening Interview",
  //   pricePerUnit: 0.6,
  //   icon: <Calculator className='w-5 h-5' />,
  //   description: "AI-driven interview with Jane",
  // },
];

export const currencyRates = {
  USD: 1,
  EUR: 0.92, // 1 USD = 0.92 EUR
  GBP: 0.79, // 1 USD = 0.79 GBP
  NGN: 1600, // 1 USD = 1600 NGN
};

export const currencySymbols = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
};
