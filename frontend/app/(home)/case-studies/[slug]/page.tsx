import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, Clock, TrendingUp, Quote } from "lucide-react";

import Footer from "@/app/common/components/Layout/Footer";
import { CustomAuthButton } from "@/app/common/components/AuthButton";

type Props = {
  params: Promise<{ slug?: string }>;
};

const caseStudies = {
  techforward: {
    company: "TechForward",
    industry: "Software Development",
    title: "Reducing Time-to-Hire by 75%",
    logo: "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    heroImage:
      "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    teamImage:
      "https://images.pexels.com/photos/3183183/pexels-photo-3183183.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    metrics: [
      { icon: <Clock />, label: "4 days average time-to-hire" },
      { icon: <Users />, label: "200+ engineers hired" },
      { icon: <TrendingUp />, label: "95% retention rate" },
    ],
    challenge: `TechForward, a rapidly growing software development company, faced significant challenges in their hiring process. With plans to double their engineering team within six months, their traditional hiring methods were proving inefficient and time-consuming.

The company's HR team was spending countless hours manually screening resumes, coordinating interviews, and managing multiple tools and platforms. This resulted in:

• A lengthy average time-to-hire of 45 days
• Significant recruiter burnout
• Inconsistent candidate evaluation
• Loss of top candidates to competitors due to slow processes`,

    solution: `After implementing Tiaago's AI-powered hiring platform, TechForward transformed their recruitment process:

1. Automated Resume Screening
Our AI system analyzed and ranked candidates based on skills, experience, and culture fit, reducing initial screening time by 90%.

2. Intelligent Skill Assessment
Automated technical assessments provided objective evaluation of candidates' skills, ensuring consistent and fair assessment.

3. AI-Driven Interview Scheduling
Smart scheduling system eliminated back-and-forth emails, automatically coordinating interviews based on availability.

4. Centralized Candidate Management
All candidate information, assessments, and feedback consolidated in one platform, improving team collaboration.`,

    results: `The impact of implementing Tiaago was immediate and significant:

• Reduced time-to-hire from 45 days to just 4 days
• Increased quality of hires with 95% passing probation
• Saved 120+ hours per month in recruiter time
• Improved candidate experience with faster feedback
• Successfully hired 200+ engineers within target timeframe

The automated screening process now handles 1000+ applications per month, with AI accurately identifying the top 2% of candidates.`,

    testimonial: {
      quote:
        "Tiaago has completely transformed how we hire. What used to take weeks now takes days, and the quality of candidates has significantly improved. Our recruiters can now focus on building relationships rather than drowning in administrative tasks.",
      author: "Jennifer Lee",
      position: "Chief People Officer",
      image:
        "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&dpr=2",
    },
  },
  growthco: {
    company: "GrowthCo",
    industry: "E-commerce",
    title: "Scaling Engineering Team 3x While Reducing Costs",
    logo: "https://images.pexels.com/photos/3182781/pexels-photo-3182781.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    heroImage:
      "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    teamImage:
      "https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    metrics: [
      { icon: <Clock />, label: "6 days average time-to-hire" },
      { icon: <Users />, label: "150+ positions filled" },
      { icon: <TrendingUp />, label: "92% offer acceptance" },
    ],
    challenge: `GrowthCo, a rapidly expanding e-commerce platform, faced a critical challenge: scaling their engineering team to meet explosive business growth while maintaining their high standards for technical talent. The company needed to triple their engineering team size within 12 months to support their expansion into new markets.

Key challenges included:

• Limited recruitment resources with only two technical recruiters
• High competition for talent in their local market
• Inconsistent technical evaluation processes
• Rising recruitment costs with traditional agencies
• Need for specialized skills across multiple tech stacks

The existing hiring process was not only slow but also expensive, with recruitment agency fees consuming a significant portion of their hiring budget. Additionally, their manual screening process was causing them to miss out on qualified candidates who were quickly accepting offers elsewhere.`,

    solution: `GrowthCo partnered with Tiaago to implement a comprehensive AI-powered hiring solution:

1. Global Talent Pool Access
Expanded their candidate pool beyond local markets with AI-powered matching to identify remote talent globally.

2. Automated Technical Screening
Implemented Tiaago's AI assessment platform to automatically evaluate candidates' technical skills across multiple domains:
• Frontend Development (React, Vue.js)
• Backend Systems (Node.js, Python)
• DevOps and Infrastructure
• Mobile Development

3. Structured Interview Process
Developed a standardized, AI-assisted interview framework that:
• Ensures consistent evaluation criteria
• Reduces interviewer bias
• Provides real-time feedback and scoring
• Automatically generates comprehensive candidate reports

4. Smart Recruitment Analytics
Implemented data-driven recruitment metrics to:
• Track pipeline efficiency
• Monitor cost-per-hire
• Analyze source effectiveness
• Predict hiring timelines

5. Automated Candidate Communication
Deployed AI-powered communication system to:
• Send personalized updates
• Schedule interviews
• Collect feedback
• Maintain candidate engagement`,

    results: `The implementation of Tiaago's platform delivered exceptional results:

Hiring Efficiency
• Reduced time-to-hire from 35 days to 6 days
• Increased candidate pipeline by 300%
• Achieved 92% offer acceptance rate
• Successfully hired 150+ engineers in 12 months

Cost Reduction
• Decreased cost-per-hire by 60%
• Eliminated external agency fees
• Reduced recruitment tool costs by 75%
• Saved 200+ hours per month in manual screening

Quality Improvements
• Increased technical assessment accuracy by 85%
• Improved candidate experience scores by 90%
• Achieved 95% hiring manager satisfaction
• Reduced new hire turnover by 40%

Global Reach
• Expanded talent pool to 20+ countries
• Increased diversity in technical roles by 60%
• Built fully remote engineering teams
• Established 24/7 development capability

The platform's success has made it the cornerstone of GrowthCo's technical hiring strategy, enabling them to scale their engineering team while improving quality and reducing costs.`,

    testimonial: {
      quote:
        "Tiaago has revolutionized our technical hiring process. We've not only been able to scale our team faster than ever before, but we're also seeing higher quality candidates and significant cost savings. The AI-powered assessments have been particularly impressive in identifying top talent globally.",
      author: "Marcus Williams",
      position: "CTO",
      image:
        "https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&dpr=2",
    },
  },
};

const CaseStudyDetail = async ({ params }: Props) => {
  const { slug } = await params;
  const study = caseStudies[slug as keyof typeof caseStudies];

  if (!study) return notFound();

  return (
    <>
      <main className='pt-24'>
        {/* Hero Section */}
        <div className='relative h-[500px] overflow-hidden'>
          <Image
            src={study.heroImage}
            alt={study.company}
            className='object-cover'
            fill
          />
          <div className='absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-900/50'></div>
          <div className='absolute inset-0 flex items-center'>
            <div className='container mx-auto px-4'>
              <div className='max-w-3xl'>
                <Link
                  href='/case-studies'
                  className='inline-flex items-center text-white mb-6 hover:text-primary-light transition-colors'
                >
                  <ArrowLeft className='w-4 h-4 mr-2' />
                  Back to Case Studies
                </Link>
                <h1 className='text-4xl md:text-5xl font-bold text-white mb-6'>
                  {study.title}
                </h1>
                <div className='flex items-center'>
                  <Image
                    src={study.logo}
                    alt={study.company}
                    className='w-16 h-16 rounded-lg mr-4 object-cover'
                    width={64}
                    height={64}
                  />
                  <div>
                    <h2 className='text-xl font-semibold text-white'>
                      {study.company}
                    </h2>
                    <p className='text-gray-300'>{study.industry}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className='container mx-auto px-4 py-16'>
          <div className='max-w-3xl mx-auto'>
            {/* Metrics */}
            <div className='grid grid-cols-3 gap-8 mb-16'>
              {study.metrics.map((metric, index) => (
                <div key={index} className='text-center'>
                  <div className='bg-primary-light rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4'>
                    <div className='text-primary'>{metric.icon}</div>
                  </div>
                  <p className='text-gray-600'>{metric.label}</p>
                </div>
              ))}
            </div>

            {/* Challenge */}
            <section className='mb-16'>
              <h2 className='text-2xl font-bold text-gray-900 mb-6'>
                The Challenge
              </h2>
              <div className='prose prose-lg'>
                {study.challenge.split("\n\n").map((paragraph, index) => (
                  <p key={index} className='text-gray-600 mb-4'>
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            {/* Solution Image */}
            <div className='relative h-96 mb-16 rounded-xl overflow-hidden'>
              <Image
                src={study.teamImage}
                alt='Team collaboration'
                className='w-full h-full object-cover'
                width={1024}
                height={512}
              />
            </div>

            {/* Solution */}
            <section className='mb-16'>
              <h2 className='text-2xl font-bold text-gray-900 mb-6'>
                Our Solution
              </h2>
              <div className='prose prose-lg'>
                {study.solution.split("\n\n").map((paragraph, index) => (
                  <p key={index} className='text-gray-600 mb-4'>
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            {/* Results */}
            <section className='mb-16'>
              <h2 className='text-2xl font-bold text-gray-900 mb-6'>
                The Results
              </h2>
              <div className='prose prose-lg'>
                {study.results.split("\n\n").map((paragraph, index) => (
                  <p key={index} className='text-gray-600 mb-4'>
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            {/* Testimonial */}
            <section className='bg-gray-50 rounded-2xl p-8 mb-16'>
              <div className='flex items-start'>
                <Quote className='w-12 h-12 text-primary mr-4 flex-shrink-0' />
                <div>
                  <p className='text-lg text-gray-600 italic mb-6'>
                    {study.testimonial.quote}
                  </p>
                  <div className='flex items-center'>
                    <Image
                      src={study.testimonial.image}
                      alt={study.testimonial.author}
                      className='w-12 h-12 rounded-full mr-4 object-cover'
                      width={48}
                      height={48}
                    />
                    <div>
                      <div className='font-medium text-gray-900'>
                        {study.testimonial.author}
                      </div>
                      <div className='text-gray-600'>
                        {study.testimonial.position}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA */}
            <div className='text-center'>
              <h3 className='text-2xl font-bold text-gray-900 mb-4'>
                Ready to Transform Your Hiring?
              </h3>
              <p className='text-gray-600 mb-8'>
                Join {study.company} and hundreds of other companies using
                Tiaago.
              </p>
              <CustomAuthButton size='lg' className='!rounded-full font-semibold'>Start Free Trial</CustomAuthButton>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CaseStudyDetail;
