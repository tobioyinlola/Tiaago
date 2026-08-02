"use client";

import Link from "next/link";
import { useState } from "react";

const faqData = [
  {
    id: 1,
    question: "How does TIAAGO work once I post a job?",
    answer:
      "Post your job, share the link. AI auto-screens applicants and sends assessments to qualified candidates (70%+ match)",
    category: "Getting Started",
  },
  {
    id: 2,
    question: "Can I invite my own candidates to apply?",
    answer:
      "Yes, you can share your public job link across your network, job boards, WhatsApp groups, or directly with candidates. TIAAGO handles the rest once they apply.",
    category: "Candidate Management",
  },
  {
    id: 3,
    question: "What happens after a candidate passes the assessment?",
    answer:
      "Candidates who pass the skill test are automatically invited to a pre-screening interview. Their scores, resumes, and screening insights will appear in your recruiter dashboard.",
    category: "Process",
  },
  {
    id: 4,
    question: "Do I need technical knowledge to use TIAAGO?",
    answer:
      "Not at all. TIAAGO is designed for all types of recruiters — whether you're hiring for tech, non-tech, junior, or senior roles. The system handles assessments, grading, and candidate ranking automatically.",
    category: "Ease of Use",
  },
  {
    id: 5,
    question: "How much does it cost to use TIAAGO?",
    answer:
      "Your first 20 candidates are completely free. After that, we use usage-based pricing starting from $0.03 per resume screening. Check our pricing page for full details on our transparent, pay-as-you-use model.",
    category: "Pricing",
  },
];

const FAQ = () => {
  const [openItem, setOpenItem] = useState<number | undefined>(1); // First item open by default

  const toggleItem = (id: number) => {
    setOpenItem(prev => (prev === id ? undefined : id));
  };

  const isOpen = (id: number) => openItem === id;

  return (
    <section className='mt-[97px] md:pt-[204px] bg-white'>
      <div className='md:container mx-auto px-4 grid md:grid-cols-2 gap-20 justify-between items-center'>
        <div className='max-w-[536px] max-md:mx-auto max-md:text-center'>
          <p className='text-sm text-primary font-jetbrains-mono mb-3 md:mb-2 max-w-3xl mx-auto px-4 sm:px-0'>
            Frequently Asked Questions
          </p>
          <h2 className='text-2xl md:text-[40px] font-semibold text-black mb-3 md:mb-2 font-onest'>
            Everything You Need to Know
          </h2>

          <p className='text-sm md:text-base text-[#0A0A0AB2] font-onest max-w-3xl mx-auto px-4 sm:px-0 md:text-center'>
            Get answers to common questions about TIAAGO&apos;s AI-powered
            hiring platform
          </p>
        </div>
        <div className='max-w-4xl max-md:mx-auto'>
          {/* FAQ Items */}
          <div className='space-y-5'>
            {faqData.map(item => (
              <div key={item.id} className='pb-5 border-b border-[#0A0A0A1A]'>
                <button
                  onClick={() => toggleItem(item.id)}
                  className='w-full pb-1 text-left focus:outline-none cursor-pointer'
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex items-start space-x-4 flex-1'>
                      {/* Question */}
                      <h3 className='text-sm md:text-base font-onest font-medium text-[#1D1D1D] flex-1 min-w-0'>
                        {item.question}
                      </h3>
                    </div>

                    {/* Toggle Icon */}
                    <div className='text-[#9E9E9E] text-2xl'>
                      {isOpen(item.id) ? "-" : "+"}
                    </div>
                  </div>
                </button>

                {/* Answer */}
                <div
                  className={`transition-all duration-300 ease-in-out ${
                    isOpen(item.id)
                      ? "max-h-96 opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div>
                    <div className='max-w-none text-[#7E8285] font-onest text-xs md:text-sm'>
                      <p className='leading-relaxed'>{item.answer}</p>
                    </div>

                    {/* Additional action for pricing question */}
                    {item.id === 5 && isOpen(item.id) && (
                      <div className='mt-4 pt-4 border-t border-gray-100'>
                        <Link
                          href='/pricing'
                          className='inline-flex items-center text-primary hover:text-primary-dark font-medium transition-colors'
                        >
                          View detailed pricing →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
