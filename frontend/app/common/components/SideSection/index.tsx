import Link from "next/link";
import Image from "next/image";
import { PropsWithChildren } from "react";
import { MdHelpOutline } from "react-icons/md";

import { cn } from "../../utils";
import BrandLink from "../BrandLink";
import SupportFAB from "../SupportFAB";
import TalentTexts from "./TalentTexts";
import StartupTexts from "./StartupTexts";
import { BasePageProps } from "../../types";
import SetUserProfile from "../Layout/SetUserProfile";
import { getCurrentUser } from "../../services/profile";

type Props = BasePageProps & {
  className?: string;
};

const SideSection = async ({
  children,
  as = "startup",
  isSignIn,
  className,
}: PropsWithChildren<Props>) => {
  const { currentUser, removeAuthCookies } = await getCurrentUser(undefined, {
    validUserRedirect: "dashboard",
    allowNull: true,
  });
  const isStartup = as === "startup";
  const mainText = isStartup ? <StartupTexts /> : <TalentTexts />;
  const href = isSignIn ? `/${as}s/signup` : `/${as}s/signin`;
  const imgTag = as === "talent" ? "talent" : "startup";
  return (
    <header
      className={cn(
        "h-fit md:h-full w-full bg-deep-blue text-white px-5 py-6 flex flex-col items-center gap-20",
        className
      )}
    >
      <SetUserProfile
        profile={currentUser}
        removeAuthCookies={removeAuthCookies}
      />
      {as !== "staff" && (
        <div className='absolute right-7 top-6 flex items-center gap-3 max-md:hidden'>
          <p className='text-dark text-base font-medium'>
            {isSignIn ? "Don't" : "Already"} have an account ?
          </p>
          <Link
            className='btn btn-primary btn-outline hover:!text-white bg-white'
            href={href}
          >
            {!isSignIn ? "Login" : "Sign up"}
          </Link>
        </div>
      )}
      <div className='flex items-center justify-between w-full'>
        <BrandLink className='fill-white' />
        <div className='flex items-center md:hidden text-sm font-medium'>
          <Link
            className='hover:text-primary flex items-center gap-2'
            href={
              isStartup
                ? "https://calendly.com/talentsyncglobal/talk-to-our-talent-support-team"
                : "mailto:support@talentsync.co"
            }
            target='_blank'
          >
            <MdHelpOutline />
            Help
          </Link>
          {as !== "staff" && (
            <>
              <span className='text-primary mx-3'>|</span>
              <Link className='hover:text-primary' href={href}>
                {!isSignIn ? "Login" : "Sign up"}
              </Link>
            </>
          )}
        </div>
      </div>
      {children}
      <div className='max-md:hidden gap-5 flex flex-col'>
        <Image
          src={`/assets/images/hero-${imgTag}.png`}
          alt={`${as} hero image`}
          width={300}
          height={250}
          priority
          className='mx-auto'
          sizes='100vw'
        />
        {mainText}
      </div>
      <SupportFAB />
    </header>
  );
};

export default SideSection;
