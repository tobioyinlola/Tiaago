import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";

import NavLink from "../NavLink";
import BrandLink from "../BrandLink";
import { CONTACT_PHONE, CONTACT_EMAIL, socialLinks } from "../../constants";

const footerLists = [
  {
    title: "Platform",
    items: [
      { name: "Recruiters", href: "/" },
      { name: "Talent Network", href: "/talent-network" },
      { name: "Comparison", href: "/comparison" },
    ],
  },
  {
    title: "Resources",
    items: [
      { name: "Blog", href: "/blogs" },
      { name: "Use Cases", href: "/use-cases" },
    ],
  },
  {
    title: "Legal",
    items: [
      { name: "Terms", href: "/terms" },
      { name: "Privacy", href: "/privacy" },
      { name: "Contact Us", href: "/contact" },
    ],
  },
];

const Footer = ({ noBorder = false }: { noBorder?: boolean }) => {
  return (
    <footer className={`pt-12 sm:pt-16 pb-8 sm:pb-12 ${noBorder ? "" : "border-t border-[#0A0A0A1A]"}`}>
      <div className='md:container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8'>
          {/* Company Info */}
          <div className='sm:col-span-2 lg:col-span-2'>
            <div className='mb-3'>
              <BrandLink containerClassName='block w-fit' />
            </div>
            <p className='text-sm text-[#5F6264] mb-6 max-w-xs'>
              AI-powered end-to-end hiring platform for modern teams.
            </p>

            {/* Contact Information */}
            <div className='space-y-3 mb-6'>
              <div className='flex items-start'>
                <MapPin className='w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0' />
                <div className='text-sm sm:text-base text-gray-600'>
                  <div>1942 Broadway St,</div>
                  <div>Suite 314C Boulder CO, US</div>
                </div>
              </div>

              <div className='flex items-center'>
                <Phone className='w-5 h-5 text-primary mr-3 flex-shrink-0' />
                <a
                  href={`tel:${CONTACT_PHONE.replaceAll(" ", "")}`}
                  className='text-sm sm:text-base text-gray-600 hover:text-primary transition-colors'
                >
                  {CONTACT_PHONE}
                </a>
              </div>

              <div className='flex items-center'>
                <Mail className='w-5 h-5 text-primary mr-3 flex-shrink-0' />
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className='text-sm sm:text-base text-gray-600 hover:text-primary transition-colors'
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>

            {/* Social Links */}
            <div className='flex space-x-4'>
              {socialLinks.map(social => (
                <Link
                  target='_blank'
                  href={social.url}
                  className='text-gray-400 hover:text-primary transition-colors'
                  key={social.url}
                >
                  <social.Icon className='w-5 h-5' />
                </Link>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          {footerLists.map(list => (
            <div key={list.title}>
              <h3 className='text-sm font-onest font-medium text-[#0A0A0A] mb-4'>
                {list.title}
              </h3>
              <ul className='space-y-3'>
                {list.items.map(item => (
                  <li key={item.name}>
                    <NavLink
                      href={item.href}
                      className='text-sm text-[#5F6264] hover:text-primary transition-colors'
                      activeClassName='text-primary'
                      exact
                    >
                      {item.name}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className='border-t border-[#0A0A0A1A] mt-8 sm:mt-12 pt-6 sm:pt-8'>
        <div className='md:container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center'>
          <p className='text-[#0A0A0A73] text-sm'>
            &copy; {new Date().getFullYear()} Tiaago. All rights reserved.
          </p>
          {/* <div className='mt-4 md:mt-0 w-full md:w-auto'>
            <ul className='flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6 text-center md:text-left'>
              <li>
                <Link
                  href='/privacy'
                  className='text-gray-500 hover:text-primary text-sm transition-colors'
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href='/terms'
                  className='text-gray-500 hover:text-primary text-sm transition-colors'
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href='#'
                  className='text-gray-500 hover:text-primary text-sm transition-colors'
                >
                  Cookie Settings
                </Link>
              </li>
            </ul>
          </div> */}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
