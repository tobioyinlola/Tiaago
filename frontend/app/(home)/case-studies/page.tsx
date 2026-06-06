import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Users, Clock, TrendingUp } from "lucide-react";

import Footer from "@/app/common/components/Layout/Footer";
import { CustomAuthButton } from "@/app/common/components/AuthButton";

export const metadata = {
  title: "Case Studies",
};

const CaseStudiesPage = () => {
  return (
    <>
      <main className='pt-24'>
        <section className='py-20'>
          <div className='mx-auto px-4'>
            <div className='max-w-3xl mx-auto text-center mb-16'>
              <h1 className='text-4xl md:text-5xl font-bold text-gray-900 mb-6'>
                Customer Success Stories
              </h1>
              <p className='text-xl text-gray-600'>
                See how leading companies are transforming their hiring process
                with Tiaago.
              </p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mb-20'>
              {[
                {
                  company: "TechForward",
                  industry: "Software Development",
                  logo: "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
                  title: "Reducing Time-to-Hire by 75%",
                  metrics: [
                    { icon: <Clock />, label: "4 days average time-to-hire" },
                    { icon: <Users />, label: "200+ engineers hired" },
                    { icon: <TrendingUp />, label: "95% retention rate" },
                  ],
                  slug: "techforward",
                },
                {
                  company: "GrowthCo",
                  industry: "E-commerce",
                  logo: "https://images.pexels.com/photos/3182781/pexels-photo-3182781.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
                  title: "Scaling Engineering Team 3x",
                  metrics: [
                    { icon: <Clock />, label: "6 days average time-to-hire" },
                    { icon: <Users />, label: "150+ positions filled" },
                    { icon: <TrendingUp />, label: "92% offer acceptance" },
                  ],
                  slug: "growthco",
                },
              ].map((study, index) => (
                <Link
                  key={index}
                  href={`/case-studies/${study.slug}`}
                  className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300'
                >
                  <Image
                    src={study.logo}
                    alt={study.company}
                    className='w-full h-48 object-cover'
                    width={500}
                    height={300}
                  />
                  <div className='p-6'>
                    <div className='text-sm text-gray-500 mb-2'>
                      {study.industry}
                    </div>
                    <h2 className='text-2xl font-bold text-gray-900 mb-2'>
                      {study.company}
                    </h2>
                    <h3 className='text-xl text-gray-700 mb-6'>
                      {study.title}
                    </h3>

                    <div className='space-y-4 mb-6'>
                      {study.metrics.map((metric, idx) => (
                        <div
                          key={idx}
                          className='flex items-center text-gray-600'
                        >
                          <div className='w-5 h-5 mr-3 text-primary'>
                            {metric.icon}
                          </div>
                          {metric.label}
                        </div>
                      ))}
                    </div>

                    <div className='flex items-center text-primary'>
                      Read Full Story
                      <ArrowRight className='ml-2 h-4 w-4' />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className='bg-primary bg-opacity-5 rounded-2xl p-8 md:p-12 text-center'>
              <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                Ready to Transform Your Hiring?
              </h2>
              <p className='text-gray-600 mb-8 max-w-2xl mx-auto'>
                Join these successful companies and revolutionize your hiring
                process with AI.
              </p>
              <CustomAuthButton size='lg'>
                Get Started Free
                <ArrowRight className='ml-2 h-5 w-5' />
              </CustomAuthButton>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default CaseStudiesPage;
