import Link from "next/link";
import { BiSolidChat } from "react-icons/bi";

import { cn, getRoleUrlSegment } from "../../utils";
import { BasePageProps } from "../../types";
import BrandLink from "../BrandLink";
import Image from "next/image";

type Props = BasePageProps & {
  children: React.ReactNode;
  title: string;
  unconstrainedWidth?: boolean;
  hideSupport?: boolean;
  className?: string;
  description?: string;
  containerClassName?: string;
  altLinkClassName?: string;
  titleContainerClassName?: string;
  goBackHref?: string;
  next?: string;
};

const AuthFormPageWrapper = ({
  children,
  title,
  className,
  containerClassName,
  altLinkClassName,
  titleContainerClassName,
  isSignIn,
  as = "recruiter",
  goBackHref,
  hideSupport,
  next,
}: Props) => {
  const hrefSuffix = next ? `?next=${next}` : "";
  const roleSegment = as === "staff" ? "admin" : getRoleUrlSegment(as!);
  const href = isSignIn
    ? `/${as === "staff" ? "recruiter" : roleSegment}/signup${hrefSuffix}`
    : `/${roleSegment}/signin${hrefSuffix}`;
  return (
    <div className='h-[100svh] w-[100svw] bg-white scrollbar-none md:scrollbar-thin relative overflow-x-hidden'>
      <Image
        src='/assets/images/Pricing Background pattern.png'
        alt='Bg pattern'
        className='object-cover'
        fill
      />
      <div className='relative grid md:grid-cols-2 max-md:items-start'>
        <div className='pl-5 py-[30px] flex max-md:hidden'>
          <div className='bg-black rounded-[30px] flex-1 pt-[65px] pb-20 px-[60px] relative'>
            <Image
              src='/assets/images/Auth Background pattern.png'
              alt='Bg pattern'
              className='object-cover'
              fill
            />
            <div className='relative flex flex-col justify-between h-full'>
              <div>
                <BrandLink
                  isAlt
                  className='text-white'
                  containerClassName='block w-fit'
                />

                <h2 className='text-white font-onest font-semibold text-[60px] leading-[110%] max-w-[562px] mt-[60px] mb-8'>
                  {as === "talent"
                    ? "Get Verified. Get Discovered. Get Hired"
                    : "Your next hire is already in your pipeline."}
                </h2>

                <p className='text-[#E4DBDB] font-onest text-xl max-w-[480px]'>
                  {as === "talent"
                    ? " Showcase your real skills, get assessed and verified, and connect with companies that value what you can truly do"
                    : "Tiaago automates resume screening, generates assessments from your job description, and surfaces the candidates worth your time — so you spend less time reading CVs and more time making placements."}
                </p>
              </div>

              <div className='bg-[#5F6264] w-full max-w-[580px] rounded-xl p-6'>
                <p className='text-[#E4DBDB] font-onest text-base mb-4'>
                  The AI assessment tools have been game-changing for our
                  technical hires. We can now accurately evaluate skills and
                  knowledge in a way that traditional interviews never could
                </p>

                <div className='flex items-center'>
                  <Image
                    src='/assets/images/Alex Parker.png'
                    alt='Alex Parker'
                    width={120}
                    height={120}
                    className='h-12 w-12 rounded-full mr-1.5 object-cover object-top'
                  />
                  <div>
                    <h6 className='font-semibold text-sm font-onest text-white'>
                      Alex Parker
                    </h6>
                    <p className='text-sm font-onest text-[#DEE1E3] mt-0.5'>
                      Software Engineer at TechWave
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* <ScrollArea className='h-[100svh]'> */}
        <main className={cn("min-h-[100svh] md:pb-5", className)}>
          <div className='px-3.5 py-5 md:hidden'>
            <BrandLink containerClassName='block w-fit' />
          </div>
          <div
            className={cn(
              "max-md:flex-1 max-md:flex flex-col w-full md:max-w-[454px] mx-auto px-4 pt-20",
              containerClassName
              // !unconstrainedWidth && "w-11/12 md:w-2/3 lg:w-1/2 xl:w-2/5"
            )}
          >
            <div className='max-md:my-auto'>
              <div className={titleContainerClassName}>
                {!!goBackHref && (
                  <Link
                    href={goBackHref}
                    className='mb-3 text-primary text-sm'
                  >{`< Back`}</Link>
                )}
                <h1 className='text-2xl md:text-4xl font-semibold text-left font-onest text-black'>
                  {title}
                </h1>
                <p
                  className={cn(
                    "text-[#5F6264] text-sm font-onest mt-2 mb-8",
                    altLinkClassName,
                    href === `/recruiter/signup${hrefSuffix}` && "invisible"
                  )}
                >
                  {isSignIn ? "Don't" : "Already"} have an account?{" "}
                  <Link
                    href={href}
                    className='font-semibold text-primary hover:underline'
                  >
                    {!isSignIn ? "Log In" : "Sign Up"}
                  </Link>
                </p>
              </div>
              {children}
            </div>

            {!hideSupport && (
              <div className='w-full flex items-center justify-center mt-10 max-md:hidden'>
                <Link
                  href='https://tawk.to/chat/66dc833e50c10f7a00a561a8/1i76m1c39'
                  target='_blank'
                  className='flex items-center gap-3 text-[#343A40] hover:text-primary px-2.5 py-[5px]'
                >
                  <p className='text-center text-base'>Chat with us</p>
                  <div className='w-6 h-6 flex items-center justify-center rounded-full bg-primary'>
                    <BiSolidChat className='text-base text-white' />
                  </div>
                </Link>
              </div>
            )}
          </div>
        </main>
        {/* </ScrollArea> */}
      </div>
    </div>
  );
};

export default AuthFormPageWrapper;
