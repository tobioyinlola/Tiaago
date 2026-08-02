import { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/common/components/Layout/Footer";
import { CustomAuthButton } from "@/app/common/components/AuthButton";
import UseCaseHero from "../_components/UseCaseHero";
import SectionHeading from "../_components/SectionHeading";
import WorkflowSteps from "../_components/WorkflowSteps";
import PricingRecapCard from "../_components/PricingRecapCard";
import CTABanner from "../_components/CTABanner";
import UseCaseFaq from "../_components/UseCaseFaq";
import AgencyVsYou from "../_components/visuals/AgencyVsYou";
import SimpleLineGraph from "../_components/visuals/SimpleLineGraph";
import StageTimeline from "../_components/visuals/StageTimeline";
import AssessmentMockup from "../_components/visuals/AssessmentMockup";

export const metadata: Metadata = {
  title: "Recruiting Infrastructure for Independent Recruiters: No Subscription | Tiaago",
  description:
    "Screen resumes, run assessments, and schedule interviews like a full agency team, solo. Usage-based pricing, no monthly fee.",
  openGraph: {
    title: "Recruiting Infrastructure for Independent Recruiters: No Subscription | Tiaago",
    description: "Screen resumes, run assessments, and schedule interviews like a full agency team, solo. No monthly fee.",
    siteName: "TIAAGO",
    type: "website",
  },
};

const FAQ_DATA = [
  {
    question: "I work alone. Is Tiaago designed for a team or can one person run it?",
    answer:
      "It was built with solo recruiters in mind. There is no minimum team size. One person can manage multiple active roles simultaneously because the screening and assessment pipeline runs without your involvement between stages. You set it up once per role and candidates move through automatically while you focus on other clients.",
  },
  {
    question: "How does the pricing work when my volume fluctuates month to month?",
    answer:
      "That is exactly why the pricing is usage-based. Busy months with three active clients cost more. Slow months with one role cost less. You never pay a fixed fee during a period you are not filling roles. Fund your wallet with what you need and it carries over. There is no expiry on credits.",
  },
  {
    question: "How quickly do candidates receive the assessment after passing screening?",
    answer:
      "Immediately. As soon as a candidate's resume passes your set threshold, the assessment invitation goes out automatically. No manual step required. This is where most independent recruiters lose candidates to agencies with more bandwidth: the gap between screening and outreach. On Tiaago that gap is zero.",
  },
  {
    question: "What does the candidate experience look like? I need it to reflect well on my agency.",
    answer:
      "Candidates receive a professional, clearly written email invitation with the role details, assessment instructions, and a deadline. The assessment interface is clean and mobile-friendly. After completing it they receive a confirmation. Every candidate who goes through the process, whether they progress or not, receives constructive, personalised feedback on their application. We tell them specifically what they did well and where they can improve for future applications. That level of care reflects directly on your agency and builds a reputation in your market that attracts stronger candidates over time.",
  },
  {
    question: "What is the catch with the first 20 candidates being free?",
    answer:
      "There is no catch. No card required to start. The first 20 candidate processings across screening and assessment are completely free so you can run a real search, see the results, and decide if Tiaago is worth using before spending anything. A candidate counts as one processing regardless of whether they go through screening only or both screening and assessment.",
  },
];

const IndependentRecruitersPage = () => (
  <>
    <main className='pt-24'>
      <UseCaseHero
        eyebrow='For independent recruiters'
        headline="You are not losing clients to better recruiters. You are losing them to faster ones."
        subhead='Tiaago screens resumes, runs assessments, and books interviews automatically, so one person can run a process that looks like a ten-person team’s. Pay per resume screened. Nothing else.'
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
        secondaryLabel='See how the process works ↓'
      />

      {/* Why You Lose Clients */}
      <section className='py-16 md:py-24 bg-white'>
        <div className='md:container mx-auto px-4'>
          <SectionHeading
            headline="A 15-person agency isn't beating you on talent. They're beating you on turnaround."
            body="When a client sends you 80 applicants, the agency down the road has three recruiters splitting the screening. You have you. Tiaago closes that gap: it screens every resume the moment it comes in, so your shortlist is ready as fast as a team's, without the team."
          />
          <AgencyVsYou />
          <p className='text-center text-xs font-onest text-[#667085] mt-8'>Same speed. Same documentation. One person.</p>
        </div>
      </section>

      {/* How It Works */}
      <section id='how-it-works' className='py-16 md:py-24 bg-[#F8FAFC]'>
        <div className='md:container mx-auto px-4'>
          <SectionHeading
            headline='Your process, minus the manual part.'
            body='Candidates apply through your unique job link. Tiaago screens each resume against your criteria, sends qualifying candidates an assessment built from the job description, and books an interview once they clear your pass mark. You show up for the conversation, with an AI copilot handling notes and the summary.'
          />
          <WorkflowSteps />
          <div className='flex flex-col items-center gap-2 mt-12'>
            <CustomAuthButton className='!bg-primary !rounded-full text-white font-semibold hover:!bg-primary-dark text-sm font-onest py-3 px-6'>
              See it on a live job post
            </CustomAuthButton>
            <p className='text-[13px] font-onest text-[#9E9E9E]'>
              No card required · First 20 candidates free · Live in under 15 minutes
            </p>
          </div>
        </div>
      </section>

      {/* No Fixed Costs */}
      <section className='py-16 md:py-24 bg-white'>
        <div className='md:container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center'>
          <div>
            <SimpleLineGraph
              series={[
                { points: [30, 70, 45, 85, 40, 90], color: "#1A3C5E" },
                { points: [30, 70, 45, 85, 40, 90], color: "#5465FF", dashed: true },
                { points: [55, 55, 55, 55, 55, 55], color: "#CBD2D9" },
              ]}
            />
            <div className='flex flex-wrap gap-4 mt-4 text-xs font-onest text-[#667085]'>
              <span className='flex items-center gap-1.5'>
                <span className='w-2.5 h-0.5 bg-brand-navy inline-block' /> Your clients
              </span>
              <span className='flex items-center gap-1.5'>
                <span className='w-2.5 h-0.5 bg-primary inline-block' /> Tiaago cost
              </span>
              <span className='flex items-center gap-1.5'>
                <span className='w-2.5 h-0.5 bg-[#CBD2D9] inline-block' /> Subscription cost
              </span>
            </div>
          </div>
          <div>
            <h2 className='text-3xl md:text-4xl font-medium font-onest text-black mb-4'>
              Your income moves with your clients. Your tools should too.
            </h2>
            <p className='text-base font-onest text-[#5F6264] mb-4'>
              Subscription tools charge you the same in your slowest month as your busiest. Tiaago charges only when
              you’re actually working a client. Between clients, you pay nothing.
            </p>
            <p className='text-sm font-onest text-[#5F6264] mb-6'>
              Pipeline, team invites, and candidate tracking: free forever. You only pay for screening and assessments.
            </p>
            <Link href='#pricing' className='text-sm font-onest text-black underline underline-offset-4 hover:text-primary'>
              Start with your first 20 free
            </Link>
          </div>
        </div>
      </section>

      {/* Never Lose a Candidate */}
      <section className='py-16 md:py-24 bg-[#F8FAFC]'>
        <div className='md:container mx-auto px-4'>
          <SectionHeading
            headline='The good candidate you forgot to follow up with is now working somewhere else.'
            body='The candidate you spoke to on Tuesday who seemed perfect, they accepted something else on Friday. Not because they were not interested. Because four days passed and nothing moved. No assessment came. No interview invite. Just silence while another process moved faster. Tiaago sends the assessment the moment a candidate passes screening. The interview invite goes the moment they pass the assessment. Nothing waits on you checking your inbox. Nothing falls through because you were on another call.'
          />
          <StageTimeline />
          <div className='text-center mt-10'>
            <Link href='#how-it-works' className='text-sm font-onest text-black underline underline-offset-4 hover:text-primary'>
              See the candidate journey
            </Link>
          </div>
        </div>
      </section>

      {/* Assessment Infrastructure */}
      <section className='py-16 md:py-24 bg-white'>
        <div className='md:container mx-auto px-4'>
          <SectionHeading
            headline='Offer clients a real assessment, not a gut-feel phone screen.'
            body='Most independent recruiters screen informally because building a proper assessment takes time they don’t have. Tiaago generates one from the job description automatically, the same quality of evaluation a large agency runs, without you writing a single question.'
          />
          <AssessmentMockup />
          <div className='text-center mt-8'>
            <Link href='#how-it-works' className='text-sm font-onest text-black underline underline-offset-4 hover:text-primary'>
              See a sample assessment
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className='py-16 md:py-24 bg-[#F8FAFC]'>
        <UseCaseFaq heading='Questions solo recruiters ask before signing up' faqData={FAQ_DATA} />
      </section>

      {/* Pricing Recap */}
      <section id='pricing' className='py-16 md:py-24 bg-white'>
        <div className='md:container mx-auto px-4'>
          <SectionHeading headline='No subscription. No seats. Just usage.' />
          <PricingRecapCard />
        </div>
      </section>
    </main>

    <CTABanner
      headline='Run your next client like a bigger team already has the tools.'
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

export default IndependentRecruitersPage;
