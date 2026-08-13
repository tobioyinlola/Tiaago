"use client";

import Image from "next/image";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "I run search for two clients at a time, max, because that's all I can screen manually. With Tiaago doing the first pass on resumes I'm now comfortable running four. Same hours in my week.",
    author: "Ngozi Adeyemi",
    position: "Independent Recruiter",
    company: "Lagos, Nigeria",
    image:
      "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&dpr=2",
    rating: 5,
  },
  {
    quote:
      "The auto-generated assessments were the part I was skeptical about. I checked the first few against questions I'd have written myself and they held up. I stopped checking after week two.",
    author: "Marcus Webb",
    position: "Engineering Manager",
    company: "Northline Systems",
    image:
      "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&dpr=2",
    rating: 5,
  },
  {
    quote:
      "We used to lose candidates in the gap between screening and the assessment invite going out, sometimes two or three days if someone was on leave. That gap is now zero and it's noticeably fewer people ghosting us mid-process.",
    author: "Sophia Chen",
    position: "Talent Partner",
    company: "BuilderAI",
    image:
      "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&dpr=2",
    rating: 5,
  },
  {
    quote:
      "Client asked why we shortlisted a candidate over someone with a flashier resume. I pulled up their screening score and assessment breakdown and had the answer in ten seconds. That never used to be a ten-second conversation.",
    author: "Tunde Bakare",
    position: "Managing Partner",
    company: "Bakare & Co. Recruiting",
    image: "/assets/images/home/Maria Latipova.png",
    rating: 5,
  },
  {
    quote:
      "Paying per resume instead of a monthly seat fee sounded like a gimmick until our hiring actually slowed down for a quarter. That month our bill was close to nothing. A subscription tool would've charged us the same as our busiest month.",
    author: "Priya Nair",
    position: "Founder",
    company: "Nair Search Partners",
    image:
      "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&dpr=2",
    rating: 4,
  },
  {
    quote:
      "I was doing first-round phone screens for roughly 15 people a week just to weed out the obvious no's. The AI interview now handles that pass, and I only get on a call with people worth my actual time.",
    author: "Daniel Osei",
    position: "Head of Talent",
    company: "Fenwick Logistics",
    image:
      "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&dpr=2",
    rating: 5,
  },
  {
    quote:
      "Connected it to Greenhouse in about ten minutes and candidates just started flowing through without anyone on my team changing how they work day to day. That was the whole reason we almost didn't switch.",
    author: "Rachel Kim",
    position: "People Ops Lead",
    company: "Vantage Robotics",
    image:
      "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&dpr=2",
    rating: 5,
  },
  {
    quote:
      "Honestly the thing I didn't expect to matter: candidates who don't make it still get written feedback on what they should improve. We've had rejected applicants email back just to say thanks for that.",
    author: "Sarah Mitchell",
    position: "Recruiting Lead",
    company: "CreativeFlow",
    image:
      "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=120&h=120&dpr=2",
    rating: 5,
  },
];

const Testimonials = () => {
  const marqueeItems = [...testimonials, ...testimonials];

  return (
    <section className='mt-20 md:pt-[172px] bg-white overflow-hidden'>
      <div className='md:container mx-auto px-4 lg:px-6 xl:px-8'>
        <div className='max-w-[536px] mx-auto text-center mb-[46px] md:mb-[80px]'>
          <p className='text-sm text-primary uppercase font-jetbrains-mono mb-3 md:mb-2 max-w-3xl mx-auto px-4 sm:px-0'>
            SEE WHAT CUSTOMERS ARE SAYING
          </p>
          <h2 className='text-2xl md:text-[40px] font-semibold text-[#110000] mb-3 md:mb-2 font-onest leading-[52px]'>
            Trusted by recruiters and hiring teams
          </h2>

          <p className='text-sm md:text-base text-[#0A0A0AB2] font-onest max-w-3xl mx-auto px-4 sm:px-0'>
            See how recruiters are revolutionizing their hiring process with
            Tiaago.
          </p>
        </div>
      </div>

      <div className='relative w-full max-w-[100svw]'>
        <div className='pointer-events-none absolute inset-y-0 left-0 z-10 w-8 md:w-32 bg-gradient-to-r from-white to-transparent' />
        <div className='pointer-events-none absolute inset-y-0 right-0 z-10 w-8 md:w-32 bg-gradient-to-l from-white to-transparent' />

        <div className='flex w-max animate-testimonial-scroll hover:[animation-play-state:paused] py-2'>
          {marqueeItems.map((testimonial, index) => (
            <div
              key={`${testimonial.author}-${index}`}
              className='mx-3 flex w-[320px] md:w-[400px] shrink-0 flex-col rounded-xl border border-[#E4E7EC] bg-[#F7F8F8] p-5 md:p-7 shadow-sm'
            >
              <div className='flex items-center gap-0.5 mb-3'>
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <Star
                    key={starIndex}
                    className={`h-3.5 w-3.5 ${
                      starIndex < testimonial.rating
                        ? "fill-primary text-primary"
                        : "fill-[#E4E7EC] text-[#E4E7EC]"
                    }`}
                  />
                ))}
              </div>

              <p className='text-[#0A0A0AB2] font-onest text-sm md:text-[15px] leading-relaxed flex-1'>
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              <div className='flex items-center mt-6'>
                <Image
                  src={testimonial.image}
                  alt={testimonial.author}
                  width={44}
                  height={44}
                  className='h-11 w-11 rounded-full mr-3 object-cover object-top'
                />
                <div>
                  <h6 className='font-semibold text-sm font-onest text-[#1D1D1D]'>
                    {testimonial.author}
                  </h6>
                  <p className='text-xs font-onest text-[#0A0A0AB2] mt-0.5'>
                    {testimonial.position} · {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
