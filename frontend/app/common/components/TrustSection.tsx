"use client";

import Image from "next/image";
import { m } from "framer-motion";

interface TrustSection {
    title: string;
    text: string;
    logo: string;
}

interface TrustDataProps {
    trustData: TrustSection[];
}

const TrustSection = ({trustData}: TrustDataProps) => {
      const containerVariants = {
        hidden: { opacity: 0, x: -100 },
        visible: {
          opacity: 1,
          x: 0,
          transition: {
            duration: 0.5,
            staggerChildren: 0.3,
          },
        },
      };

      const iconVariants = {
        hidden: { rotate: 0 },
        visible: {
          rotate: 360,
          transition: { duration: 1 },
        },
      };

  return (
    <m.div
      initial='hidden'
      whileInView='visible'
      variants={containerVariants}
      viewport={{ once: true, amount: 0.1 }}
      className='flex flex-col lg:flex-row justify-center items-center gap-20 lg:gap-10'
    >
      {trustData.map((item: TrustSection, index: number) => (
        <div key={index} className='flex flex-col gap-3 items-center'>
          <m.div
            initial='hidden'
            whileInView='visible'
            viewport={{ once: true, amount: 0.1 }}
            variants={iconVariants}
          >
            <Image
              src={`/assets/icons/companies/${item.logo}.svg`}
              alt={item.logo}
              width={30}
              height={30}
            />
          </m.div>
          <h1 className='font-medium'>{item.title}</h1>
          <p className='text-sm w-72 text-center text-[#d1cece]'>{item.text}</p>
        </div>
      ))}
    </m.div>
  );
};

export default TrustSection;
