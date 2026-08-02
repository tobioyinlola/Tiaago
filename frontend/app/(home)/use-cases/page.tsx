import { ArrowRight } from "lucide-react";
import Link from "next/link";

import Footer from "@/app/common/components/Layout/Footer";

export const metadata = {
  title: "Use Cases",
  description:
    "See how recruitment agencies, independent recruiters, and in-house talent teams use Tiaago to screen, assess, and hire faster.",
};

const USE_CASES = [
  {
    eyebrow: "Recruitment agencies",
    pain: "Stop paying flat monthly fees for tools that sit idle in your slowest months.",
    outcome: "Screen resumes, run assessments, and schedule interviews. Usage-based, no seats.",
    href: "/use-cases/recruitment-agencies",
    label: "See the agency page",
  },
  {
    eyebrow: "Independent recruiters",
    pain: "Compete with agencies ten times your size.",
    outcome: "The same screening and assessment infrastructure a large team runs, solo.",
    href: "/use-cases/independent-recruiters",
    label: "See the independent recruiter page",
  },
  {
    eyebrow: "In-house talent teams",
    pain: "Every recruiter on your team is applying a slightly different standard to the same job.",
    outcome: "One evaluation standard, every requisition, every recruiter, so hiring managers trust the shortlist.",
    href: "/use-cases/in-house-teams",
    label: "See the in-house team page",
  },
];

const UseCasesPage = () => {
  return (
    <>
      <main className='pt-32 md:pt-40 pb-24'>
        <section className='max-w-2xl mx-auto text-center px-4 mb-16 md:mb-20'>
          <h1 className='text-4xl md:text-5xl font-medium font-onest text-black mb-6'>
            Built for how you actually hire.
          </h1>
          <p className='text-lg font-onest text-[#5F6264]'>
            It&rsquo;s the same product underneath, usage-based screening, assessment, and scheduling, but the
            problem it solves looks different depending on your seat.
          </p>
        </section>

        <div className='md:container mx-auto px-4 grid md:grid-cols-3 gap-6 max-w-5xl'>
          {USE_CASES.map(useCase => (
            <Link
              key={useCase.href}
              href={useCase.href}
              className='group flex flex-col rounded-2xl border border-[#E4E7EC] bg-white p-8 hover:border-brand-navy transition-colors'
            >
              <span className='text-[11px] font-jetbrains-mono uppercase tracking-widest text-primary font-semibold mb-4'>
                {useCase.eyebrow}
              </span>
              <p className='text-lg font-onest font-medium text-black mb-3 leading-snug'>{useCase.pain}</p>
              <p className='text-sm font-onest text-[#5F6264] mb-6 flex-1'>{useCase.outcome}</p>
              <span className='flex items-center gap-1.5 text-sm font-onest font-medium text-black group-hover:text-primary transition-colors'>
                {useCase.label}
                <ArrowRight className='h-4 w-4' />
              </span>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default UseCasesPage;
