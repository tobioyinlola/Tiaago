import { ReactNode } from "react";

/** Light close, matching the homepage's "Automate with TIAAGO" section
 * (radial gradient, dark headline, blue pill CTA) instead of a navy
 * full-bleed block -- identical treatment across all 3 pages so the shared
 * endpoint reads as one product. `secondaryCta` renders a lower-emphasis
 * button beside the primary one, for the in-house page's
 * "Get started for free" + "Start a pilot" pairing. */
const CTABanner = ({
  headline,
  primaryCta,
  secondaryCta,
  friction,
}: {
  headline: string;
  primaryCta: ReactNode;
  secondaryCta?: ReactNode;
  friction?: string[];
}) => (
  <section className='bg-white px-4'>
    <div className='max-w-[1200px] mx-auto bg-[radial-gradient(100%_100%_at_50%_0%,#FFFFFF_70%,#EEEFFF_100%)] py-16 md:py-24 rounded-2xl text-center'>
      <h2 className='text-3xl md:text-[42px] leading-tight font-medium font-onest text-black max-w-2xl mx-auto mb-8'>
        {headline}
      </h2>
      <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
        {primaryCta}
        {secondaryCta}
      </div>
      {!!friction?.length && (
        <p className='mt-6 text-sm font-onest text-[#9E9E9E]'>{friction.join(" · ")}</p>
      )}
    </div>
  </section>
);

export default CTABanner;
