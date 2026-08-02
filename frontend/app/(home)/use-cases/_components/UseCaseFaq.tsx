"use client";

import { useState } from "react";

/** Reuses the main site's FAQ layout (see app/(home)/_components/FAQ.tsx)
 * instead of the generic FaqList box style, so the use-case pages match the
 * rest of the site: two-column, bordered accordion rows with a +/- toggle. */
interface Faq {
  question: string;
  answer: string;
}

const UseCaseFaq = ({
  eyebrow = "Frequently Asked Questions",
  heading,
  description,
  faqData,
}: {
  eyebrow?: string;
  heading: string;
  description?: string;
  faqData: Faq[];
}) => {
  const [openIndex, setOpenIndex] = useState<number | undefined>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(prev => (prev === index ? undefined : index));
  };

  return (
    <div className='md:container mx-auto px-4 grid md:grid-cols-2 gap-12 md:gap-20 items-start'>
      <div className='max-w-[536px] max-md:mx-auto max-md:text-center'>
        <p className='text-sm text-primary font-jetbrains-mono mb-3 md:mb-2'>{eyebrow}</p>
        <h2 className='text-2xl md:text-[40px] font-semibold text-black mb-3 md:mb-2 font-onest'>{heading}</h2>
        {description && (
          <p className='text-sm md:text-base text-[#0A0A0AB2] font-onest max-md:text-center'>{description}</p>
        )}
      </div>
      <div className='max-w-4xl max-md:mx-auto w-full'>
        <div className='space-y-5'>
          {faqData.map((item, index) => (
            <div key={item.question} className='pb-5 border-b border-[#0A0A0A1A]'>
              <button
                onClick={() => toggleItem(index)}
                className='w-full pb-1 text-left focus:outline-none cursor-pointer'
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-start space-x-4 flex-1'>
                    <h3 className='text-sm md:text-base font-onest font-medium text-black flex-1 min-w-0'>
                      {item.question}
                    </h3>
                  </div>
                  <div className='text-[#9E9E9E] text-2xl'>{openIndex === index ? "-" : "+"}</div>
                </div>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === index ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className='max-w-none text-[#7E8285] font-onest text-xs md:text-sm pt-2'>
                  <p className='leading-relaxed'>{item.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UseCaseFaq;
