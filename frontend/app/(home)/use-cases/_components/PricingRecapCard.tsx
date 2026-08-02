import Link from "next/link";

import { pricingTiers, currencySymbols } from "@/app/(home)/pricing/constants";

/** Reused verbatim across all 3 use-case pages -- pulls real figures from
 * the actual pricing config (pricePerUnitNGN is the backend's real NGN
 * price, not derived via a currency rate) rather than hardcoding
 * illustrative numbers, so this never drifts out of sync with /pricing.
 * `extraLine` lets the in-house page add its team-scaling note without
 * forking the component. */
const PricingRecapCard = ({ extraLine }: { extraLine?: string }) => {
  return (
    <div className='max-w-md mx-auto bg-white border-2 border-brand-navy rounded-2xl p-8 md:p-10'>
      <p className='text-xs font-jetbrains-mono uppercase tracking-widest text-primary mb-2 text-center'>
        No subscription · No seats
      </p>
      <div className='flex flex-col divide-y divide-[#EAECF0]'>
        {pricingTiers.map(tier => (
          <div key={tier.name} className='flex items-center justify-between py-3'>
            <span className='text-sm font-onest text-[#344054]'>{tier.name}</span>
            <span className='text-base font-onest font-semibold text-black'>
              {currencySymbols.NGN}
              {tier.pricePerUnitNGN}
            </span>
          </div>
        ))}
        <div className='flex items-center justify-between py-3'>
          <span className='text-sm font-onest text-[#344054]'>Pipeline &amp; team invites</span>
          <span className='text-sm font-onest font-semibold text-primary'>Free forever</span>
        </div>
        <div className='flex items-center justify-between py-3'>
          <span className='text-sm font-onest text-[#344054]'>First 20 candidate processings</span>
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
    </div>
  );
};

export default PricingRecapCard;
