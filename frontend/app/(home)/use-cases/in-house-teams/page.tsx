import { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/common/components/Layout/Footer";
import { CustomAuthButton } from "@/app/common/components/AuthButton";
import CustomButton from "@/app/common/components/CustomButton";
import UseCaseHero from "../_components/UseCaseHero";
import SectionHeading from "../_components/SectionHeading";
import WorkflowSteps from "../_components/WorkflowSteps";
import PricingRecapCard from "../_components/PricingRecapCard";
import CTABanner from "../_components/CTABanner";
import UseCaseFaq from "../_components/UseCaseFaq";
import RankedShortlistCard from "../_components/visuals/RankedShortlistCard";
import StackConsolidation from "../_components/visuals/StackConsolidation";
import SimpleLineGraph from "../_components/visuals/SimpleLineGraph";
import DocumentMockup from "../_components/visuals/DocumentMockup";

const DEMO_LINK = "https://cal.com/tiaago/book-a-demo-tiaago-ai-hiring-platform";

export const metadata: Metadata = {
  title: "One Evaluation Standard for Every Recruiter on Your Team | Tiaago",
  description:
    "Replace disconnected hiring tools with one pipeline. Consistent AI screening and assessments across every requisition. Usage-based, no per-seat fees.",
  openGraph: {
    title: "One Evaluation Standard for Every Recruiter on Your Team | Tiaago",
    description: "Replace disconnected hiring tools with one pipeline. Consistent AI screening across every requisition.",
    siteName: "TIAAGO",
    type: "website",
  },
};

const FAQ_DATA = [
  {
    question: "Our company already has an ATS in place. Does Tiaago replace it?",
    answer:
      "No and it is not designed to. Your ATS manages your applicant tracking, compliance records, and HR workflows. Tiaago adds an AI intelligence layer on top: screening candidates against defined criteria, running structured assessments, and providing interview support that a standard ATS does not offer. The two work alongside each other.",
  },
  {
    question: "How do we ensure consistency across different recruiters reviewing candidates for the same role?",
    answer:
      "Consistency comes from the criteria being set at the job level, not from individual recruiter judgment at the screening stage. Every candidate for a role is evaluated against the same defined requirements by the AI before any human reviews them. The shortlist a recruiter reviews reflects structured criteria, not whoever happened to screen applications that morning.",
  },
  {
    question: "We have concerns about AI bias in hiring. How does Tiaago address this?",
    answer:
      "Tiaago's AI evaluates every candidate against the same defined criteria set by the recruiter. It does not consider name, gender, age, photo, or any protected characteristic, because none of those appear in the criteria you set. The evaluation is based on the match between the candidate's stated experience and the role requirements. Every AI decision is visible and auditable. Recruiter oversight is built in at every stage: no candidate is automatically rejected without the recruiter having access to the reasoning.",
  },
  {
    question: "Can we run pilots on specific roles before rolling it out more broadly?",
    answer:
      "Yes, and that is how most teams start. Enable Tiaago for one high-volume role, run one search end to end, review the shortlist quality and time saved, and compare with your previous process for that role type. There is no commitment required beyond the candidate processing you actually use during the pilot.",
  },
  {
    question: "How is candidate data handled from a GDPR perspective?",
    answer:
      "Candidate data is stored securely and is not shared with third parties or used to train AI models. Candidates can request deletion of their data. Your organisation retains control of its candidate database and can export or delete records at any time. Tiaago is designed to support GDPR compliance for organisations operating in the EU and UK. Specific data processing agreements are available on request for enterprise customers.",
  },
];

const InHouseTeamsPage = () => (
  <>
    <main className='pt-24'>
      <UseCaseHero
        eyebrow='For in-house talent teams'
        headline="Your hiring managers don't think your team is slow. They think your team is inconsistent."
        subhead='Tiaago screens and assesses every candidate against the same standard, for every recruiter, on every requisition, so "time to shortlist" stops depending on who’s working the role.'
        primaryCta={
          <div className='flex flex-col items-center gap-2'>
            <CustomButton
              variant='primary'
              className='!bg-primary !rounded-full text-white font-semibold hover:!bg-primary-dark text-sm font-onest py-3 px-6'
            >
              <a href={DEMO_LINK} target='_blank' rel='noopener noreferrer'>
                Get started for free
              </a>
            </CustomButton>
            <p className='text-[13px] font-onest text-[#9E9E9E]'>
              No procurement process required · One requisition is enough to see it work
            </p>
          </div>
        }
        secondaryHref='#standard'
        secondaryLabel='See how standardization works ↓'
      />

      {/* The Real Problem Isn't Volume */}
      <section className='py-16 md:py-24 bg-white'>
        <div className='md:container mx-auto px-4'>
          <SectionHeading
            headline='Two recruiters, the same job, two different shortlists.'
            body="When evaluation criteria live in each recruiter's head instead of a shared system, which shortlist a candidate gets depends on who screened them, not just what they can do. That's the actual complaint hiring managers are making when they say hiring is slow. It's not speed, it's that they can't trust the process is repeatable."
          />
          <div className='flex flex-col sm:flex-row items-center justify-center gap-6'>
            <RankedShortlistCard
              label='Recruiter A'
              order={[
                { initials: "AO", score: 88 },
                { initials: "BA", score: 82 },
                { initials: "CN", score: 75 },
              ]}
            />
            <RankedShortlistCard
              label='Recruiter B'
              order={[
                { initials: "BA", score: 90 },
                { initials: "CN", score: 85 },
                { initials: "AO", score: 70 },
              ]}
            />
          </div>
          <p className='text-center text-xs font-onest text-[#667085] mt-6'>
            Consistency, not just speed, is what closes the credibility gap with hiring managers.
          </p>
        </div>
      </section>

      {/* One Standard, Every Requisition */}
      <section id='standard' className='py-16 md:py-24 bg-[#F8FAFC]'>
        <div className='md:container mx-auto px-4'>
          <SectionHeading
            headline='Every requisition runs the same screening logic, no matter who owns it.'
            body="Criteria are set once per job and applied identically to every applicant. Assessments are generated from the job description itself, not a recruiter's personal judgment. Whoever's covering the req, a new hire on your team or your most senior recruiter, every candidate gets evaluated the same way."
          />
          <div className='flex justify-center'>
            <RankedShortlistCard
              label='Same criteria, every recruiter'
              unified
              order={[
                { initials: "AO", score: 91 },
                { initials: "BA", score: 87 },
                { initials: "CN", score: 74 },
              ]}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className='py-16 md:py-24 bg-white'>
        <div className='md:container mx-auto px-4'>
          <SectionHeading
            headline='One pipeline, applied identically across your team.'
            body='A candidate applies through the job’s unique link. Tiaago screens the resume against the criteria set for that requisition, sends qualifying candidates the AI-generated assessment, and books an interview once they clear the pass mark. Interview notes and a candidate summary are generated automatically, the same format, every time, for every recruiter.'
          />
          <WorkflowSteps />
          <div className='flex flex-col items-center gap-2 mt-12'>
            <CustomButton
              variant='primary'
              className='!bg-primary !rounded-full text-white font-semibold hover:!bg-primary-dark text-sm font-onest py-3 px-6'
            >
              <a href={DEMO_LINK} target='_blank' rel='noopener noreferrer'>
                Book a walkthrough
              </a>
            </CustomButton>
            <p className='text-[13px] font-onest text-[#9E9E9E]'>
              No procurement process required · One requisition is enough to see it work
            </p>
          </div>
        </div>
      </section>

      {/* Replace the Stack, Not Add to It */}
      <section className='py-16 md:py-24 bg-[#F8FAFC]'>
        <div className='md:container mx-auto px-4'>
          <SectionHeading
            headline="You don't need a sixth tool. You need your other five to talk to each other."
            body='Screening, assessment, scheduling, and interview notes currently live in separate tools that don’t share data. Tiaago runs all four in one pipeline: the resume that gets screened is the same record that gets assessed, scheduled, and summarized. Nothing gets re-entered or lost in a handoff between systems.'
          />
          <StackConsolidation />
          <div className='text-center mt-10'>
            <Link href='#standard' className='text-sm font-onest text-black underline underline-offset-4 hover:text-primary'>
              See what this replaces
            </Link>
          </div>
        </div>
      </section>

      {/* Scale Through Growth Phases */}
      <section className='py-16 md:py-24 bg-white'>
        <div className='md:container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center'>
          <div>
            <SimpleLineGraph
              series={[
                { points: [20, 35, 30, 60, 55, 90], color: "#1A3C5E" },
                { points: [30, 32, 30, 34, 32, 35], color: "#5465FF" },
              ]}
            />
            <div className='flex flex-wrap gap-4 mt-4 text-xs font-onest text-[#667085]'>
              <span className='flex items-center gap-1.5'>
                <span className='w-2.5 h-0.5 bg-brand-navy inline-block' /> Application volume
              </span>
              <span className='flex items-center gap-1.5'>
                <span className='w-2.5 h-0.5 bg-primary inline-block' /> Recruiter headcount
              </span>
            </div>
          </div>
          <div>
            <h2 className='text-3xl md:text-4xl font-medium font-onest text-black mb-4'>
              Handle your next hiring surge without a headcount request.
            </h2>
            <p className='text-base font-onest text-[#5F6264] mb-6'>
              When screening and assessment run automatically, a growth-phase spike in applications doesn’t mean
              a proportional spike in recruiter hours. Your team absorbs volume increases without needing to justify
              additional TA headcount to finance every time the business scales up.
            </p>
            <a
              href={DEMO_LINK}
              target='_blank'
              rel='noopener noreferrer'
              className='text-sm font-onest text-black underline underline-offset-4 hover:text-primary'
            >
              Model this for your next growth phase
            </a>
          </div>
        </div>
      </section>

      {/* What Hiring Managers See */}
      <section className='py-16 md:py-24 bg-[#F8FAFC]'>
        <div className='md:container mx-auto px-4'>
          <SectionHeading
            headline='A shortlist your hiring managers can actually trust.'
            body='Every candidate on the shortlist arrives with their screening score against the criteria the hiring manager agreed to, their assessment result, and an AI-generated interview summary. Hiring managers stop asking "why is this person on the list": the answer is already attached.'
          />
          <DocumentMockup title='Shortlist, shared with hiring manager' />
        </div>
      </section>

      {/* FAQ */}
      <section className='py-16 md:py-24 bg-white'>
        <UseCaseFaq heading='Questions TA leads ask before rolling this out' faqData={FAQ_DATA} />
      </section>

      {/* Pricing Recap */}
      <section className='py-16 md:py-24 bg-[#F8FAFC]'>
        <div className='md:container mx-auto px-4'>
          <SectionHeading headline='Your cost scales with hiring volume, not with team size.' />
          <PricingRecapCard extraLine='Add recruiters to your team at no additional cost. You’re only billed for screening and assessment activity.' />
        </div>
      </section>
    </main>

    <CTABanner
      headline='You have a role that has taken too long. Hand it to Tiaago.'
      primaryCta={
        <CustomButton
          variant='primary'
          className='!bg-primary !rounded-full text-white font-semibold hover:!bg-primary-dark text-sm font-onest py-3 px-6'
        >
          <a href={DEMO_LINK} target='_blank' rel='noopener noreferrer'>
            Run it through Tiaago
          </a>
        </CustomButton>
      }
      secondaryCta={
        <Link
          href='/contact'
          className='text-sm font-onest text-black/70 hover:text-black border border-[#D0D5DD] hover:border-black/40 py-3 px-6 rounded-full transition-colors'
        >
          Set up my account
        </Link>
      }
      friction={["No contract", "No seat fees", "Pay only when candidates move through"]}
    />
    <Footer />
  </>
);

export default InHouseTeamsPage;
