import { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/common/components/Layout/Footer";
import { CustomAuthButton } from "@/app/common/components/AuthButton";
import { getPublicPricingConfig } from "@/app/common/services/pricing";
import { getDefaultCurrency } from "@/app/common/utils/geo";
import { buildPricingTiers, FREE_TIER_LIMIT } from "@/app/(home)/pricing/constants";
import UseCaseHero from "../_components/UseCaseHero";
import SectionHeading from "../_components/SectionHeading";
import WorkflowSteps from "../_components/WorkflowSteps";
import PricingRecapCard from "../_components/PricingRecapCard";
import CTABanner from "../_components/CTABanner";
import UseCaseFaq from "../_components/UseCaseFaq";
import Reveal from "../_components/Reveal";
import MandateCostSlider from "../_components/visuals/MandateCostSlider";
import BeforeAfterBar from "../_components/visuals/BeforeAfterBar";
import DocumentMockup from "../_components/visuals/DocumentMockup";

export const metadata: Metadata = {
  title: "Recruitment Agency Software That Charges Per Resume, Not Per Month | Tiaago",
  description:
    "Screen resumes, run assessments, and schedule interviews without a flat monthly fee. Usage-based pricing per resume and assessment. First 20 candidates free.",
  openGraph: {
    title: "Recruitment Agency Software That Charges Per Resume, Not Per Month | Tiaago",
    description:
      "Screen resumes, run assessments, and schedule interviews without a flat monthly fee. First 20 candidates free.",
    siteName: "TIAAGO",
    type: "website",
  },
};

const FAQ_DATA = [
  {
    question: "We already use an ATS. Do we have to replace it to use Tiaago?",
    answer:
      "No. Connect your existing ATS directly to Tiaago from your settings page. Greenhouse and Teamtailor users can link their account and import candidates straight into Tiaago without downloading or uploading anything. Your existing system stays in place. Tiaago handles the screening, assessment, and interview intelligence layer that your ATS was never designed to do.",
  },
  {
    question: "How long does it take to set up a new role and start receiving screened candidates?",
    answer:
      "About 15 minutes from posting to your first screened applicant. You create the job, set your screening criteria and pass mark, set your assessment pass mark, and post the shareable link. From that point the pipeline runs automatically. Most agencies have their first shortlist within 24 to 48 hours of posting.",
  },
  {
    question: "We have 5 recruiters. How do team accounts work?",
    answer:
      "Every team member is free to invite. There are no per-seat fees. All five recruiters can access the same pipeline, see the same candidate scores, and manage the same jobs under one organisation account. You pay only for the candidate processing that happens, not for the people doing the reviewing.",
  },
  {
    question: "How do we know the AI screening is not missing good candidates?",
    answer:
      "Every candidate score and the reasoning behind it is visible in your dashboard. You can review any AI decision and override it at any time. The shortlist is ranked, not filtered to a binary yes or no. You see where every candidate sits relative to your criteria and can adjust the threshold if the results are not reflecting what you expect. The AI never hides candidates from you.",
  },
  {
    question: "Is there a minimum spend or monthly commitment?",
    answer:
      "No. You fund your wallet with whatever amount you choose and spend it as you go. There is no monthly minimum, no annual contract, and no subscription. If you have a slow month with no active roles, your cost is zero.",
  },
];

const RecruitmentAgenciesPage = async () => {
  const [pricing, currency] = await Promise.all([getPublicPricingConfig(), getDefaultCurrency()]);
  const pricingTiers = buildPricingTiers(pricing);
  const freeTierLimit = Number(pricing.free_tier_limit) || FREE_TIER_LIMIT;

  return (
  <>
    <main className='pt-24'>
      <UseCaseHero
        eyebrow='For recruitment agencies'
        headline='Your recruiters are spending 4 out of every 10 hours reading resumes that don’t qualify.'
        subhead='Tiaago screens every resume against your criteria, runs the assessment, and books the interview before a recruiter opens the file. You pay per resume screened. Nothing when the pipeline is quiet.'
        primaryCta={
          <div className='flex flex-col items-center gap-2'>
            <CustomAuthButton className='!bg-primary !rounded-full text-white font-semibold hover:!bg-primary-dark text-sm font-onest py-3 px-6'>
              Screen your first 20 candidates free
            </CustomAuthButton>
            <p className='text-[13px] font-onest text-[#9E9E9E]'>
              No card required · First 20 candidates free · Live in under 15 minutes
            </p>
          </div>
        }
        secondaryHref='#how-it-works'
        secondaryLabel='See the workflow ↓'
        trustCaption='Built for agencies running 5 to 20 recruiters across multiple live clients.'
      />

      {/* The Math */}
      <Reveal as='section' className='py-16 md:py-24 bg-white'>
        <div className='md:container mx-auto px-4'>
          <SectionHeading
            headline='You already know what a quiet month costs you in tool fees.'
            body='Most screening and ATS tools charge you the same amount whether you have 40 open clients or four. Tiaago doesn’t. You pay only when candidates are actually moving through your pipeline. No seats, no monthly minimum, no renewal call.'
          />
          <MandateCostSlider pricingTiers={pricingTiers} />
          <p className='text-center text-sm font-onest text-[#5F6264] mt-8'>
            Pipeline management, team invites, and candidate tracking are free forever. You only pay for screening and assessments.
          </p>
        </div>
      </Reveal>

      {/* How It Works */}
      <Reveal as='section' id='how-it-works' className='py-16 md:py-24 bg-[#F8FAFC]'>
        <div className='md:container mx-auto px-4'>
          <SectionHeading
            headline='One link in, a ranked shortlist out.'
            body='Create the job once. Candidates apply through a unique public URL. Tiaago screens every resume against the criteria your recruiter sets, auto-invites qualified candidates to an assessment built from the job description, and books an interview slot for anyone who clears the pass mark. Your recruiter steps in at the interview, with an AI copilot taking notes and generating the summary.'
          />
          <WorkflowSteps />
          <div className='flex flex-col items-center gap-2 mt-12'>
            <CustomAuthButton className='!bg-primary !rounded-full text-white font-semibold hover:!bg-primary-dark text-sm font-onest py-3 px-6'>
              Try it on your next client
            </CustomAuthButton>
            <p className='text-[13px] font-onest text-[#9E9E9E]'>
              No card required · First 20 candidates free · Live in under 15 minutes
            </p>
          </div>
        </div>
      </Reveal>

      {/* Time Reclaimed */}
      <Reveal as='section' className='py-16 md:py-24 bg-white'>
        <div className='md:container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center'>
          <div>
            <p className='text-7xl font-onest font-semibold text-black mb-2'>40%</p>
            <p className='text-sm font-onest text-[#667085] mb-8'>
              of recruiter time currently spent on manual screening, reallocated to candidate and client conversations.
            </p>
            <BeforeAfterBar />
          </div>
          <div>
            <h2 className='text-3xl md:text-4xl font-medium font-onest text-black mb-4'>
              Give your recruiters back the 40% they lose to screening.
            </h2>
            <p className='text-base font-onest text-[#5F6264] mb-6'>
              A recruiter reading 200 resumes for one client spends most of a working day just filtering for minimum
              qualifications. Tiaago does that pass in minutes, so your team’s time goes into candidate
              conversations and client management, the parts of the job that actually close clients.
            </p>
            <Link href='#how-it-works' className='text-sm font-onest text-black underline underline-offset-4 hover:text-primary'>
              See time saved on your clients
            </Link>
          </div>
        </div>
      </Reveal>

      {/* Client-Facing Credibility */}
      <Reveal as='section' className='py-16 md:py-24 bg-[#F8FAFC]'>
        <div className='md:container mx-auto px-4'>
          <SectionHeading
            headline='Hand your client a shortlist they can’t argue with.'
            body='Every candidate who reaches your client comes with a documented trail: the criteria they were screened against, their assessment score, and an AI-generated summary of their interview. When a client asks why someone made the cut, you have the answer already written.'
          />
          <DocumentMockup />
          <p className='text-center text-xs font-onest text-[#667085] mt-4'>
            Sample candidate summary: screening criteria, assessment score, and interview notes in one document.
          </p>
        </div>
      </Reveal>

      {/* Scale Without Headcount */}
      <Reveal as='section' className='py-20 md:py-28 bg-white'>
        <div className='md:container mx-auto px-4 text-center max-w-2xl'>
          <h2 className='text-3xl md:text-4xl font-medium font-onest text-black mb-4'>
            Take the next client without hiring the next recruiter.
          </h2>
          <p className='text-base font-onest text-[#5F6264]'>
            When screening, assessment, and scheduling run themselves,{" "}
            <span className='underline decoration-primary decoration-2 underline-offset-4'>
              one recruiter can carry more open clients at once
            </span>
            . Agencies use the margin this creates to take on new clients before deciding they need to grow the team.
          </p>
        </div>
      </Reveal>

      {/* FAQ */}
      <section className='py-16 md:py-24 bg-[#F8FAFC]'>
        <UseCaseFaq heading='Questions agencies ask before signing up' faqData={FAQ_DATA} />
      </section>

      {/* Pricing Recap */}
      <Reveal as='section' className='py-16 md:py-24 bg-white'>
        <div className='md:container mx-auto px-4'>
          <SectionHeading headline='No subscription. No seats. Just usage.' />
          <PricingRecapCard pricingTiers={pricingTiers} freeTierLimit={freeTierLimit} currency={currency} />
        </div>
      </Reveal>
    </main>

    <CTABanner
      headline='Put your next client through Tiaago.'
      primaryCta={
        <CustomAuthButton className='!bg-primary !rounded-full text-white font-semibold hover:!bg-primary-dark text-sm font-onest py-3 px-6'>
          Screen your first 20 candidates free
        </CustomAuthButton>
      }
      friction={["No card required", "First 20 candidates free", "Live in under 15 minutes"]}
    />
    <Footer />
  </>
  );
};

export default RecruitmentAgenciesPage;
