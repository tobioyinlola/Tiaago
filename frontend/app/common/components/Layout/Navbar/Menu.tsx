"use client";
import { m } from "framer-motion";

import Link from "next/link";

import { MdOutlineClose } from "react-icons/md";
import BrandLink from "../../BrandLink";
import AuthButton from "../../AuthButton";
const navlinks = [
  { name: "For Companies", link: "/companies" },
  { name: "For Talent", link: "/talents" },
  { name: "Why Tiaago", link: "/about" },
  { name: "Pricing", link: "/pricing" },
  { name: "Blog", link: "/blogs" },
];

type props = {
  setViewMenu: React.Dispatch<React.SetStateAction<boolean>>;
};

const Menu = ({ setViewMenu }: props) => {
  return (
    <div
      className='lg:hidden w-[100svw] h-[100svh] bg-[#0000005e] fixed z-50'
      onClick={() => setViewMenu(false)}
    >
      <m.div
        initial={{ opacity: 0, x: -100 }}
        animate={{
          opacity: 1,
          x: 0,
          transition: {
            duration: 1,
          },
        }}
        className='py-3 px-4 md:p-10 w-[60svw] menu:w-[40vw] h-[100svh] bg-white flex flex-col shadow-md'
      >
        <div className='flex items-center justify-between my-2 mb-12 w-full'>
          <BrandLink />
          <button
            className='border-2 rounded-full'
            onClick={() => setViewMenu(false)}
          >
            <MdOutlineClose className='text-2xl' />
          </button>
        </div>

        <div className='flex flex-col font-semibold justify-between text-left w-full text-lg mb-auto'>
          {navlinks.map((nav, i) => (
            <div
              key={i}
              className='my-4 text-left hover:text-[#5465FF]'
              onClick={() => setViewMenu(false)}
            >
              <Link href={nav.link}>{nav.name}</Link>
            </div>
          ))}
        </div>

        <AuthButton className='btn btn-primary rounded-full' />
      </m.div>
    </div>
  );
};

export default Menu;
