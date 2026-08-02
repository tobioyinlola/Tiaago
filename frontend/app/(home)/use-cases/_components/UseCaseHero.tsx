import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

/** Shared hero for the 3 use-case pages -- reuses the site's established
 * top-of-page pattern (radial gradient + background pattern image, see
 * Contact/Pricing). */
const UseCaseHero = ({
  eyebrow,
  headline,
  subhead,
  primaryCta,
  secondaryHref,
  secondaryLabel,
  trustCaption,
}: {
  eyebrow: string;
  headline: string;
  subhead: string;
  primaryCta: ReactNode;
  secondaryHref?: string;
  secondaryLabel?: string;
  trustCaption?: string;
}) => (
  <section className='relative pt-16 md:pt-[102px] pb-14 md:pb-20 bg-[radial-gradient(100%_100%_at_50%_0%,#FFFFFF_70%,#EEEFFF_100%)]'>
    <Image
      src='/assets/images/Pricing Background pattern.png'
      alt=''
      className='object-cover opacity-60'
      fill
    />
    <div className='md:container mx-auto px-4 relative'>
      <div className='max-w-3xl mx-auto text-center'>
        <span className='inline-block text-xs font-jetbrains-mono uppercase tracking-widest text-primary mb-4'>
          {eyebrow}
        </span>
        <h1 className='text-4xl md:text-[52px] leading-[1.1] font-medium font-onest text-black mb-5'>
          {headline}
        </h1>
        <p className='text-lg font-onest max-w-[620px] text-center mx-auto text-[#5F6264] mb-8'>
          {subhead}
        </p>

        <div className='flex flex-col items-center gap-4'>
          {primaryCta}
          {secondaryHref && secondaryLabel && (
            <Link
              href={secondaryHref}
              className='text-sm font-onest text-black/70 hover:text-black transition-colors underline underline-offset-4'
            >
              {secondaryLabel}
            </Link>
          )}
        </div>

        {trustCaption && (
          <p className='mt-10 text-xs font-onest text-[#5F6264]'>{trustCaption}</p>
        )}
      </div>
    </div>
  </section>
);

export default UseCaseHero;
