"use client";

import { cn } from "@/app/common/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useParams } from "next/navigation";

const NavItems = ({}) => {
  const pathname = usePathname();
  const params = useParams();
  const isActive = (path: string) => (path = pathname);

  const navlinks = [
    { name: "For Companies", link: "/companies" },
    { name: "For Talents", link: "/talents" },
    { name: "Why Tiaago", link: "/about" },
    { name: "Pricing", link: "/pricing" },
    { name: "Blog", link: "/blogs" },
  ];
  return (
    <nav className='w-[76%]'>
      <ul className='flex font-semibold justify-between text-sm'>
        {navlinks.map((nav, i) => (
          <div key={i} className='flex flex-col justify-center px-3 relative'>
            <Link
              href={nav.link}
              className={`${
                isActive(nav.link) === nav.link ||
                isActive(nav.link) === `${nav.link}/${params.id}`
                  ? "text-[#5465FF]"
                  : "hover:text-primary"
              } text-center text-lg font-urbanist flex flex-col justify-center peer`}
            >
              {nav.name}
            </Link>
            <div
              className={cn(
                "w-[100%] h-[1px] bg-[#5465FF] invisible peer-hover:visible absolute -bottom-2 left-0",
                (isActive(nav.link) === `${nav.link}/${params.id}` ||
                  isActive(nav.link) === nav.link) &&
                  "visible"
              )}
            ></div>
          </div>
        ))}
      </ul>
    </nav>
  );
};

export default NavItems;
