"use client";

import { useState } from "react";
import Image from "next/image";
import { m } from "framer-motion";

interface Faq {
  question: string;
  answer: string;
}

interface FaqListProps {
  faqData: Faq[];
}

const FaqList = ({ faqData }: FaqListProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="flex flex-col gap-5">
      {faqData.map((faq: Faq, index: number) => (
        <div
          key={index}
          className='bg-[#F5F6FF] py-3 px-4 rounded-xl flex flex-col gap-3'
        >
          <div
            onClick={() => toggleAccordion(index)}
            className='flex cursor-pointer justify-between lg:gap-3'
          >
            <p className=' font-bold text-lg w-72 lg:w-full'>{faq.question}</p>
            <Image
              src={`/assets/icons/talents/${
                openIndex === index ? "acc-up.svg" : "acc-down.svg"
              }`}
              alt=''
              width={15}
              height={15}
            />
          </div>
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: openIndex === index ? "auto" : 0,
              opacity: openIndex === index ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
            className='overflow-hidden'
          >
            <p className='text-sm w-64 lg:w-[70vw] font-medium'>{faq.answer}</p>
          </m.div>
        </div>
      ))}
    </div>
  );
};

export default FaqList;
