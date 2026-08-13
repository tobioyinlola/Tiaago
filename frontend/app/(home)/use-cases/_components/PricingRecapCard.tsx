import Link from "next/link";

import { pricingTiers as fallbackPricingTiers, currencySymbols, PricingTier, FREE_TIER_LIMIT as FALLBACK_FREE_TIER_LIMIT } from "@/app/(home)/pricing/constants";
import Reveal from "./Reveal";

/** Reused verbatim across all 3 use-case pages -- pulls real figures from
 * the actual pricing config (pricePerUnitNGN is the backend's real NGN
 * price, not derived via a currency rate) rather than hardcoding
 * illustrative numbers, so this never drifts out of sync with /pricing.
 * `pricingTiers`/`freeTierLimit` come from the page's own server-side fetch
 * of the live PricingConfig (see each use-case page's page.tsx) -- defaults
 * here only cover a caller that skips that fetch. `currency` is the
 * visitor's geo-detected currency (see common/utils/geo.ts): NGN in
 * Nigeria, USD everywhere else. `extraLine` lets the in-house page add its
 * team-scaling note without forking the component. */
const PricingRecapCard = ({
  extraLine,
  pricingTiers = fallbackPricingTiers,
  freeTierLimit = FALLBACK_FREE_TIER_LIMIT,
  currency = "USD",
}: {
  extraLine?: string;
  pricingTiers?: PricingTier[];
  freeTierLimit?: number;
  currency?: "NGN" | "USD";
}) => {
  return (
    <Reveal className='max-w-md mx-auto bg-white border-2 border-brand-navy rounded-2xl p-8 md:p-10 transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl'>
      <p className='text-xs font-jetbrains-mono uppercase tracking-widest text-primary mb-2 text-center'>
        No subscription · No seats
      </p>
      <div className='flex flex-col divide-y divide-[#EAECF0]'>
        {pricingTiers.map(tier => (
          <div key={tier.name} className='flex items-center justify-between py-3'>
            <span className='text-sm font-onest text-[#344054]'>{tier.name}</span>
            <span className='text-base font-onest font-semibold text-black'>
              {currency === "NGN" ? (
                <>
                  {currencySymbols.NGN}
                  {tier.pricePerUnitNGN}
                </>
              ) : (
                <>
                  {currencySymbols.USD}
                  {tier.pricePerUnit}
                </>
              )}
            </span>
          </div>
        ))}
        <div className='flex items-center justify-between py-3'>
          <span className='text-sm font-onest text-[#344054]'>Pipeline &amp; team invites</span>
          <span className='text-sm font-onest font-semibold text-primary'>Free forever</span>
        </div>
        <div className='flex items-center justify-between py-3'>
          <span className='text-sm font-onest text-[#344054]'>First {freeTierLimit} candidate processings</span>
          <span className='text-sm font-onest font-semibold text-primary'>Free</span>
        </div>
      </div>
      {extraLine && (
        <p className='mt-4 text-xs font-onest text-[#5F6264] text-center'>{extraLine}</p>
      )}
      <Link
        href='/pricing'
        className='block text-center mt-6 text-sm font-onest text-black underline underline-offset-4 hover:text-primary transition-colors'
      >
        Full pricing details
      </Link>
    </Reveal>
  );
};

export default PricingRecapCard;
