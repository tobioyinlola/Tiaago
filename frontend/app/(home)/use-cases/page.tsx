import Image from "next/image";
import { ArrowRight } from "lucide-react";

import Footer from "@/app/common/components/Layout/Footer";
import { CustomAuthButton } from "@/app/common/components/AuthButton";

export const metadata = {
  title: "Use Cases",
  description:
    "See how staffing agencies, internal HR teams, and job seekers use Tiaago to hire and get hired faster with AI.",
};

const USE_CASES = [
  {
    eyebrow: "For Staffing Agencies",
    title: "Source top quality candidates for your clients in no time.",
    description:
      "Run AI-screened, assessment-backed pipelines across every client role at once. Tiaago handles resume screening, skill assessments, and shortlisting automatically, so your team spends time closing placements, not sifting through applications.",
    image: "/assets/images/home/staffing agencies.png",
    imageAlt: "Staffing agencies using Tiaago",
  },
  {
    eyebrow: "For Internal HR Teams",
    title: "Recruit the right people and build an unbeatable workforce.",
    description:
      "Post a role once and let Tiaago&apos;s AI screen resumes against your criteria, generate role-specific assessments, and surface a ranked shortlist -- so your hiring managers only ever see candidates worth interviewing.",
    image: "/assets/images/home/internal hr teams.png",
    imageAlt: "Internal HR teams using Tiaago",
  },
  {
    eyebrow: "For Job Seekers",
    title: "Tiaago connects you with the right opportunities.",
    description:
      "Build a portfolio once, get matched to roles that actually fit your skills, and prove yourself with fair, consistent AI-graded assessments instead of getting filtered out by keyword-matching resume software.",
    image: "/assets/images/home/job seeker.png",
    imageAlt: "Job seekers using Tiaago",
  },
];

const UseCasesPage = () => {
  return (
    <>
      <main className='pt-24 pb-20'>
        <section className='max-w-3xl mx-auto text-center px-4 mb-16 md:mb-24'>
          <span className='text-[11px] font-jetbrains-mono uppercase tracking-widest text-[#5465FF] font-semibold'>
            Use Cases
          </span>
          <h1 className='text-4xl md:text-5xl font-bold text-gray-900 mt-3 mb-6'>
            Built for every side of hiring
          </h1>
          <p className='text-lg text-gray-600'>
            Whether you&apos;re staffing for clients, hiring in-house, or looking for
            your next role -- Tiaago&apos;s AI-powered hiring pipeline works for you.
          </p>
        </section>

        <div className='md:container mx-auto px-4 lg:px-6 xl:px-8 flex flex-col gap-20 md:gap-28'>
          {USE_CASES.map((useCase, index) => (
            <section
              key={useCase.eyebrow}
              className={`grid md:grid-cols-2 gap-8 md:gap-14 items-center ${
                index % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div>
                <span className='text-[11px] font-jetbrains-mono uppercase tracking-widest text-[#5465FF] font-semibold'>
                  {useCase.eyebrow}
                </span>
                <h2 className='text-2xl md:text-3xl font-bold text-gray-900 mt-3 mb-4 leading-tight'>
                  {useCase.title}
                </h2>
                <p className='text-gray-600 text-base md:text-lg leading-relaxed mb-6'>
                  {useCase.description}
                </p>
                <CustomAuthButton size='lg'>
                  Get Started Free
                  <ArrowRight className='ml-2 h-5 w-5' />
                </CustomAuthButton>
              </div>
              <div className='bg-[#0A0A0A0A] p-2 md:p-3 rounded-xl'>
                <Image
                  src={useCase.image}
                  alt={useCase.imageAlt}
                  className='object-cover rounded-lg w-full'
                  width={706}
                  height={480}
                />
              </div>
            </section>
          ))}
        </div>

        <div className='max-w-3xl mx-auto px-4 mt-20 md:mt-28'>
          <div className='bg-primary bg-opacity-5 rounded-2xl p-8 md:p-12 text-center'>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              Ready to Transform Your Hiring?
            </h2>
            <p className='text-gray-600 mb-8 max-w-2xl mx-auto'>
              Join teams already hiring faster and fairer with Tiaago&apos;s AI-powered
              platform.
            </p>
            <CustomAuthButton size='lg'>
              Get Started Free
              <ArrowRight className='ml-2 h-5 w-5' />
            </CustomAuthButton>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default UseCasesPage;
