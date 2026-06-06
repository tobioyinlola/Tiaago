import Image from "next/image";
import { Users, Target, Globe, Award } from "lucide-react";

import Footer from "@/app/common/components/Layout/Footer";

const page = () => {
  return (
    <>
      <main className='pt-24'>
        <section className='py-20'>
          <div className='container mx-auto px-4'>
            <div className='max-w-3xl mx-auto text-center mb-16'>
              <h1 className='text-4xl md:text-5xl font-bold text-gray-900 mb-6'>
                Revolutionizing Hiring with AI
              </h1>
              <p className='text-xl text-gray-600'>
                We&apos;re on a mission to transform the hiring process, making
                it more efficient, accurate, and fair for both companies and
                candidates.
              </p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-12 mb-20'>
              <div>
                <h2 className='text-2xl font-bold text-gray-900 mb-4'>
                  Our Story
                </h2>
                <p className='text-gray-600 mb-6'>
                  Founded in 2025, Tiaago emerged from a simple observation: the
                  hiring process was broken. Companies spent countless hours
                  screening resumes and conducting interviews, while talented
                  candidates often got overlooked.
                </p>
                <p className='text-gray-600'>
                  We built an AI-powered platform that automates the entire
                  hiring process, from resume screening to skill assessment and
                  initial interviews. Our system achieves 95% accuracy in
                  candidate matching, helping companies find the right talent
                  faster while ensuring a fair and unbiased process.
                </p>
              </div>
              <div className='relative'>
                <div className='absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-10 rounded-xl transform rotate-3'></div>
                <Image
                  src='https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
                  alt='Team collaboration'
                  className='relative rounded-xl shadow-lg object-cover'
                  width={1260}
                  height={750}
                />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-4 gap-8 mb-20'>
              {[
                {
                  icon: <Users className='h-8 w-8' />,
                  title: "95%",
                  description: "AI Accuracy Rate",
                },
                {
                  icon: <Target className='h-8 w-8' />,
                  title: "80%",
                  description: "Time Saved in Hiring",
                },
                {
                  icon: <Globe className='h-8 w-8' />,
                  title: "50+",
                  description: "Countries Served",
                },
                {
                  icon: <Award className='h-8 w-8' />,
                  title: "10k+",
                  description: "Successful Placements",
                },
              ].map((stat, index) => (
                <div key={index} className='text-center'>
                  <div className='bg-primary bg-opacity-10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <div className='text-primary'>{stat.icon}</div>
                  </div>
                  <div className='text-3xl font-bold text-gray-900 mb-2'>
                    {stat.title}
                  </div>
                  <div className='text-gray-600'>{stat.description}</div>
                </div>
              ))}
            </div>

            <div className='bg-gray-50 rounded-2xl p-8 md:p-12'>
              <h2 className='text-2xl font-bold text-gray-900 mb-8 text-center'>
                Our Values
              </h2>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
                {[
                  {
                    title: "Innovation First",
                    description:
                      "We continuously push the boundaries of what's possible with AI in hiring.",
                  },
                  {
                    title: "Fairness & Transparency",
                    description:
                      "Our AI is designed to eliminate bias and provide equal opportunities.",
                  },
                  {
                    title: "User-Centric",
                    description:
                      "Every feature is built with our users' needs and experience in mind.",
                  },
                ].map((value, index) => (
                  <div key={index} className='text-center'>
                    <h3 className='text-xl font-semibold text-gray-900 mb-3'>
                      {value.title}
                    </h3>
                    <p className='text-gray-600'>{value.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default page;
