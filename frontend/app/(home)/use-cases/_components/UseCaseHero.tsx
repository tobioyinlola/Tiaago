"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { m, Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

/** Shared hero for the 3 use-case pages -- reuses the site's established
 * top-of-page pattern (radial gradient + background pattern image, see
 * Contact/Pricing). Content staggers in on mount (not scroll-triggered --
 * it's above the fold, visible immediately) so the page feels alive from
 * the first paint instead of the whole product feeling static. */
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
  <section className='relative pt-16 md:pt-[102px] pb-14 md:pb-20 bg-[radial-gradient(100%_100%_at_50%_0%,#FFFFFF_70%,#EEEFFF_100%)] overflow-hidden'>
    <Image
      src='/assets/images/Pricing Background pattern.png'
      alt=''
      className='object-cover opacity-60'
      fill
    />
    <div className='md:container mx-auto px-4 relative'>
      <m.div
        className='max-w-3xl mx-auto text-center'
        variants={containerVariants}
        initial='hidden'
        animate='visible'
      >
        <m.span
          variants={itemVariants}
          className='inline-block text-xs font-jetbrains-mono uppercase tracking-widest text-primary mb-4'
        >
          {eyebrow}
        </m.span>
        <m.h1
          variants={itemVariants}
          className='text-4xl md:text-[52px] leading-[1.1] font-medium font-onest text-black mb-5'
        >
          {headline}
        </m.h1>
        <m.p
          variants={itemVariants}
          className='text-lg font-onest max-w-[620px] text-center mx-auto text-[#5F6264] mb-8'
        >
          {subhead}
        </m.p>

        <m.div variants={itemVariants} className='flex flex-col items-center gap-4'>
          {primaryCta}
          {secondaryHref && secondaryLabel && (
            <Link
              href={secondaryHref}
              className='text-sm font-onest text-black/70 hover:text-black transition-colors underline underline-offset-4'
            >
              {secondaryLabel}
            </Link>
          )}
        </m.div>

        {trustCaption && (
          <m.p variants={itemVariants} className='mt-10 text-xs font-onest text-[#5F6264]'>
            {trustCaption}
          </m.p>
        )}
      </m.div>
    </div>
  </section>
);

export default UseCaseHero;
