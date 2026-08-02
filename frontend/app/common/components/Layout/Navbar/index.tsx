"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import NavLink from "../../NavLink";
import { cn } from "@/app/common/utils";
import BrandLink from "../../BrandLink";
import AuthButton from "../../AuthButton";
import { useUserStore } from "@/app/common/store/useUser";

export const navLinks = [
  {
    name: "Use Cases",
    href: "/use-cases",
  },
  {
    name: "Pricing",
    href: "/pricing",
  },
  {
    name: "Contact",
    href: "/contact",
  },
];

const Navbar = ({ scrollElId = "", hideAuthButtons = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const currentUser = useUserStore(s => s.profile);

  const pathname = usePathname();
  const isOnHomePage = pathname === "/";
  const isOnTalentRelatedPage = pathname.includes("talent");

  const isJobDetailsPage = pathname.includes("/jobs/");

  return (
    <header className='absolute top-0 left-0 right-0 z-10 lg:px-6 xl:px-8 bg-transparent py-3 md:py-7'>
      <div className='md:container mx-auto px-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center'>
            <BrandLink isWhite={isOnHomePage} className='max-md:scale-75' />
          </div>

          {!isJobDetailsPage && (
            <>
              {/* Desktop Navigation */}
              <nav className='hidden md:flex items-center space-x-8'>
                {navLinks.map(link => (
                  <div key={link.name} className='relative group'>
                    <NavLink
                      href={link.href}
                      className={cn(
                        "text-gray-700 hover:text-primary transition-colors font-onest text-sm",
                        isOnHomePage && "text-white/70 hover:text-white"
                      )}
                      activeClassName={cn(
                        "text-primary font-medium",
                        isOnHomePage && "text-white"
                      )}
                    >
                      {link.name}
                    </NavLink>
                  </div>
                ))}
              </nav>

              {hideAuthButtons ? (
                <div />
              ) : (
                <div className='hidden md:flex items-center space-x-4'>
                  <AuthButton
                    className={cn(
                      "text-xs font-medium font-onest",
                      !isOnHomePage &&
                        "btn btn-outline btn-sm px-4 border-gray-300",
                      isOnHomePage &&
                        !currentUser &&
                        "text-white/70 hover:text-white",
                      currentUser &&
                        "btn btn-sm text-black bg-white px-4 hover:bg-white hover:text-black"
                    )}
                  />
                  {!currentUser && (
                    <Link
                      href={
                        isOnTalentRelatedPage
                          ? "/talents/signin"
                          : "/recruiter/signin"
                      }
                      className={cn(
                        "btn btn-sm text-xs px-4 border-gray-300 font-medium font-onest",
                        isOnHomePage ? "btn-outline" : "btn-primary",
                        isOnHomePage &&
                          !currentUser &&
                          "text-black bg-white px-4"
                      )}
                    >
                      Log in
                    </Link>
                  )}
                </div>
              )}
            </>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={cn(
              "md:hidden text-gray-700 focus:outline-none",
              isOnHomePage && "text-white"
            )}
            id='mobile-drawer'
          >
            {isMenuOpen ? (
              <X className='w-6 h-6' />
            ) : (
              <Menu className='w-6 h-6' />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className='md:hidden bg-white mt-4 p-4 rounded-lg shadow-lg border border-gray-200'>
            <nav className='flex flex-col space-y-4'>
              {navLinks.map(link => (
                <div key={link.name}>
                  <NavLink
                    href={link.href}
                    className='block text-gray-700 hover:text-primary py-2 transition-colors font-onest text-sm'
                    activeClassName='text-primary font-medium'
                    colsesMobileDrawer
                  >
                    {link.name}
                  </NavLink>
                </div>
              ))}
            </nav>
            {!hideAuthButtons && (
              <div className='mt-6 space-y-3'>
                {!currentUser && (
                  <Link
                    href={
                      isOnTalentRelatedPage
                        ? "/talents/signin"
                        : "/recruiter/signin"
                    }
                    className='btn btn-outline w-full border-gray-300 min-h-[40px] h-10 font-medium'
                  >
                    Log in
                  </Link>
                )}
                <AuthButton className='btn btn-primary rounded-full w-full font-medium min-h-[40px] h-10' />
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
