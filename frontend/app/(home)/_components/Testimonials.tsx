"use client";

import Image from "next/image";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    quote:
      "Tiaago has completely transformed our hiring process. We've cut our time-to-hire by 75% while finding better candidates than ever before.",
    author: "Jennifer Lee",
    position: "Chief People Officer",
    company: "TechForward",
    image:
      "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&dpr=2",
    rating: 5,
  },
  {
    quote:
      "The AI assessment tools have been game-changing for our technical hires. We can now accurately evaluate skills and knowledge in a way that traditional interviews never could.",
    author: "Marcus Williams",
    position: "CTO",
    company: "DataSync Solutions",
    image:
      "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&dpr=2",
    rating: 5,
  },
  {
    quote:
      "As a fast-growing startup, we needed to scale our team quickly without sacrificing quality. Tiaago helped us do exactly that, identifying candidates that were perfect cultural and technical fits.",
    author: "Sophia Chen",
    position: "VP of Engineering",
    company: "BuilderAI",
    image:
      "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&dpr=2",
    rating: 4,
  },
  {
    quote:
      "The AI assessment tools have been game-changing for our technical hires. We can now accurately evaluate skills and knowledge in a way that traditional interviews never could.",
    author: "Sarah Mitchell",
    position: "UX Designer",
    company: "CreativeFlow",
    image: "/assets/images/home/Maria Latipova.png",
    rating: 5,
  },
];

const Testimonials = () => {
  return (
    <section className='mt-20 md:pt-[172px] bg-white'>
      <div className='md:container mx-auto px-4 lg:px-6 xl:px-8'>
        <div className='max-w-[536px] mx-auto text-center mb-[46px] md:mb-[100px]'>
          <p className='text-sm text-primary uppercase font-jetbrains-mono mb-3 md:mb-2 max-w-3xl mx-auto px-4 sm:px-0'>
            SEE WHAT CUSTOMERS SAYING
          </p>
          <h2 className='text-2xl md:text-[40px] font-semibold text-[#110000] mb-3 md:mb-2 font-onest leading-[52px]'>
            Trusted by Industry Leaders
          </h2>

          <p className='text-sm md:text-base text-[#0A0A0AB2] font-onest max-w-3xl mx-auto px-4 sm:px-0'>
            See how recruiters are revolutionizing their hiring process with
            Tiaago.
          </p>
        </div>

        <div className='max-md:carousel max-w-[calc(100svw-2rem)] max-md:carousel-center max-md:space-x-3 md:grid grid-cols-2 md:gap-8'>
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className='max-md:carousel-item max-md:w-[calc(100svw-4rem)] bg-[#F7F8F8] rounded-xl p-4 md:p-8 shadow-sm flex flex-col md:h-full'
            >
              <h6 className='text-[#0A0A0AB2] font-onest font-medium text-sm md:text-lg'>
                {testimonial.quote}
              </h6>

              <div className='flex items-center mt-[120px] md:mt-[220px]'>
                <Image
                  src={testimonial.image}
                  alt={testimonial.author}
                  width={120}
                  height={120}
                  className='h-12 w-12 rounded-full mr-1.5 object-cover object-top'
                />
                <div>
                  <h6 className='font-semibold text-sm font-onest text-[#1D1D1D]'>
                    {testimonial.author}
                  </h6>
                  <p className='text-sm font-onest text-[#0A0A0AB2] mt-0.5'>
                    {testimonial.position} at {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* <div className='flex justify-center mt-10'>
          <div className='flex space-x-3'>
            <button className='h-10 w-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100'>
              <ChevronLeft className='h-5 w-5' />
            </button>
            <button className='h-10 w-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100'>
              <ChevronRight className='h-5 w-5' />
            </button>
          </div>
        </div> */}
      </div>
    </section>
  );
};

export default Testimonials;
