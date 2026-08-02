"use client";

import Image from "next/image";

const INTEGRATIONS = [
  { name: "Zoho Recruit", logo: "zoho-recruit" },
  { name: "RecruiterFlow", logo: "recruiterflow" },
  { name: "BambooHR", logo: "bamboohr" },
  { name: "Recruitee", logo: "recruitee" },
  { name: "Lever", logo: "lever" },
  { name: "Workable", logo: "workable" },
  { name: "Ashby", logo: "ashby" },
  { name: "BreezyHR", logo: "breezyhr" },
  { name: "JazzHR", logo: "jazzhr" },
];

/** Auto-scrolling row of supported ATS integrations -- same
 * animate-infinite-scroll pattern as AnimatedOtherInterestingFeatures. Logos
 * are the same ones the recruiter dashboard's "Connect your ATS" picker
 * pulls from Nango (see ats_integrations.nango_client.list_integrations),
 * downloaded once and self-hosted under public/assets/icons/integrations
 * rather than hotlinked from Nango's CDN. */
const IntegrationsMarquee = () => {
  const items = [...INTEGRATIONS, ...INTEGRATIONS];

  return (
    <div className='relative w-full max-w-[calc(100svw-2rem)] overflow-hidden bg-transparent py-4'>
      <div className='flex w-max animate-infinite-scroll hover:[animation-play-state:paused]'>
        {items.map((integration, index) => (
          <div
            key={`${integration.name}-${index}`}
            className='mx-3 flex min-w-[200px] items-center gap-3 rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm'
          >
            <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10'>
              <Image
                src={`/assets/icons/integrations/${integration.logo}.svg`}
                alt={integration.name}
                width={20}
                height={20}
              />
            </span>
            <h6 className='font-onest text-sm font-medium text-black'>{integration.name}</h6>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IntegrationsMarquee;
