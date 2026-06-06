"use client";

import { m, Variants } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.2,
      when: "beforeChildren",
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
} satisfies Variants;

const AnimatedList = ({ requirements }: { requirements: string[] }) => {
  return (
    <m.ul
      variants={containerVariants}
      initial='hidden'
      whileInView='visible'
      viewport={{ once: true, amount: 0.2 }}
      className='md:max-w-[630px] bg-[#0A0A0A08] rounded-[20px] px-7 md:px-12 py-8 md:py-[60px] space-y-1.5 md:space-y-2'
    >
      {requirements.map((requirement, i) => (
        <m.li
          key={requirement}
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className='bg-white rounded-xl p-4 flex items-center gap-2 cursor-pointer transition-transform duration-200'
        >
          <div className='flex items-center justify-center text-center bg-primary rounded-full w-8 h-8 text-white font-medium font-onest text-xs shrink-0'>
            {i + 1}
          </div>

          <h6 className='text-black text-base font-medium font-onest'>
            {requirement}
          </h6>
        </m.li>
      ))}
    </m.ul>
  );
};

export default AnimatedList;
