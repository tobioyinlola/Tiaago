import { Calculator } from "lucide-react";

export interface PricingTier {
  name: string;
  pricePerUnit: number;
  icon: React.ReactNode;
  description: string;
}

export interface SubscriptionPlan {
  name: string;
  price: { monthly: number; annually: number };
  description: string;
  features: string[];
  popular: boolean;
  color: string;
  ctaText: string;
  limits: string;
  discount?: string;
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

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    name: "Free",
    price: { monthly: 0, annually: 0 },
    description: "Perfect for testing the platform",
    features: [
      "Unlimited job postings",
      "Unlimited candidate scheduling",
      "20 resume screenings",
      "10 assessments",
      "Basic support",
      "Pre-screening interviews (Coming Soon)",
    ],
    popular: false,
    color: "border-gray-200",
    ctaText: "Start for free",
    limits: "20 screenings • 10 assessments",
  },
  {
    name: "Starter",
    price: { monthly: 49, annually: 490 },
    description: "For independent recruiters and HRs",
    features: [
      "Everything in Free",
      "1,000 resume screenings",
      "200 assessments",
      "Priority support",
      "Basic analytics",
      "Pre-screening interviews (Coming Soon)",
    ],
    popular: false,
    color: "border-gray-200",
    ctaText: "Get Started",
    limits: "1,000 screenings • 200 assessments",
    discount: "25% off first month",
  },
  {
    name: "Pro",
    price: { monthly: 99, annually: 990 },
    description: "Recommended for agencies",
    features: [
      "Everything in Free",
      "2,000 resume screenings",
      "400 assessments",
      "Priority support",
      "Advanced analytics",
      "Pre-screening interviews (Coming Soon)",
    ],
    popular: true,
    color: "border-primary",
    ctaText: "Get Started",
    limits: "2,000 screenings • 400 assessments",
    discount: "25% off first month",
  },
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
