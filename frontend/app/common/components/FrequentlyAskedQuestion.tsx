"use client";
import Image from "next/image";
import React, { useState } from "react";
import triangle_polygon from "../../../public/assets/images/home/accordion/triangle_polygon.png";
import {
  HiOutlineArrowCircleDown,
  HiOutlineArrowCircleUp,
} from "react-icons/hi";
import { m } from "framer-motion";
import FaqList from "./FaqList";

const accordion_content = [
  {
    question: "What is Tiaago?",
    answer:
      "Tiaago is a private marketplace connecting vetted and qualified talent with recruiters and businesses worldwide across various technical and non-technical skills sets",
  },
  {
    question: "How does Tiaago vet its talents?",
    answer:
      "We assess talent based on three criteria: portfolio review, project-based assessment, and cultural fit evaluation.",
  },
  {
    question: "How can companies interact with potential hires?",
    answer:
      "Companies can post jobs, message talents directly, schedule virtual calls, and send interview requests through our platform.",
  },
  {
    question: "What makes Tiaago different from other talent marketplace?",
    answer:
      " Our rigorous vetting process and focus on both technical and cultural fit ensure that we provide only the highest quality talent to our clients.",
  },
];

const FrequentlyAskedQuestion = () => {
  const [openSection, setOpenSection] = useState<number | null>(null);

  const toggleSection = (index: number) => {
    setOpenSection(openSection === index ? null : index);
  };

  return (
    // <section className='px-10 md:px-40 '>
    //   <div className='py-14 my-20 rounded-3xl relative overflow-hidden'>
    //     <div className='w-16 h-16 md:w-24 md:h-24 bg-[#5465FF] rounded-full absolute -left-6 top-2 md:-top-2.5'></div>
    //     <div className='w-10 h-10 bg-[#1C3477] rounded-full absolute -bottom-1'></div>
    //     <Image
    //       src={triangle_polygon}
    //       alt='polygon'
    //       className='absolute right-2 md:inline-block min-[300px]:hidden'
    //     />

    //     <h2 className='text-center text-xl font-bold my-4 z-50'>
    //       Frequently Asked Questions
    //     </h2>
    //     <div className='join join-vertical w-full border-none rounded-none'>
    //       {accordion_content.map((content, index) => (
    //         <div
    //           key={index}
    //           tabIndex={0}
    //           className='collapse collapse join-item bg-[#F5F6FF] rounded-none my-6 cursor-pointer'
    //         >
    //           <div
    //             className='collapse-title text-base font-bold flex justify-between items-center'
    //             onClick={() => toggleSection(index)}
    //           >
    //             {content.header}

    //             {openSection === index ? (
    //               <HiOutlineArrowCircleDown className='ml-2 font-thin' />
    //             ) : (
    //               <HiOutlineArrowCircleUp className='ml-2 font-thin' />
    //             )}
    //           </div>
    //           {openSection === index && (
    //             <div className='collapse-content text-sm'>
    //               {content.contents}
    //             </div>
    //           )}
    //         </div>
    //       ))}
    //     </div>
    //   </div>
    // </section>
    <m.div
      className='md:w-2/3 min-[300px]:w-full mx-auto py-14 md:px-24 min-[300px]:px-10 my-20 rounded-3xl relative overflow-hidden'
      variants={{
        hidden: { opacity: 0, scale: 0.5 },
        visible: { opacity: 1, scale: 1 },
      }}
      initial='hidden'
      whileInView='visible'
      transition={{ duration: 1, delay: 0.25 }}
      viewport={{ once: true, amount: 0.1 }}
    >
      <div className='w-24 h-24 bg-[#5465FF] rounded-full absolute -left-6 -top-2.5'></div>
      <div className='w-10 h-10 bg-[#1C3477] rounded-full absolute -bottom-1'></div>
      <Image
        src={triangle_polygon}
        alt='polygon'
        className='absolute right-2 md:inline-block min-[300px]:hidden'
      />

      <h2 className='text-center text-xl font-bold my-4'>
        Frequently Asked Questions
      </h2>
      <FaqList faqData={accordion_content} />
    </m.div>
  );
};

export default FrequentlyAskedQuestion;
