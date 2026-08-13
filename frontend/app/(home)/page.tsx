import Image from "next/image";
import { FileSearch, ClipboardCheck, Mic, Radar, Plug, BarChart3 } from "lucide-react";

import FAQ from "./_components/FAQ";
import { cn } from "../common/utils";
import Testimonials from "./_components/Testimonials";
import Footer from "@/app/common/components/Layout/Footer";
import CustomButton from "@/app/common/components/CustomButton";
import { CustomAuthButton } from "@/app/common/components/AuthButton";
import AnimatedList from "./_components/AnimatedList";
import AnimatedOtherInterestingFeatures from "./_components/AnimatedOtherinterestingFeatures";
import IntegrationsMarquee from "./_components/IntegrationsMarquee";

// export const metadata = {
//   title: "Recruiters",
// };

const requirements = {
  cards: [
    {
      Icon: () => (
        <svg
          width='20'
          height='20'
          viewBox='0 0 20 20'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path
            d='M10.3414 2.00057C10.1148 2.64289 9.99946 3.31916 10.0003 4.00029H1.99971V18H16.0003V10.0003C16.7014 10.0003 17.3743 9.88029 18 9.65914V19.0003C18 19.5523 17.5526 20.0006 16.9997 20.0006H1.00029C0.868926 20.0006 0.738853 19.9747 0.617493 19.9244C0.496133 19.8742 0.385862 19.8005 0.292977 19.7076C0.200092 19.6147 0.126411 19.5044 0.0761422 19.3831C0.0258732 19.2617 0 19.1316 0 19.0003V3C0 2.448 0.447428 2.00057 1.00029 2.00057H10.3414ZM16.0003 6C16.5306 6 17.0393 5.78932 17.4143 5.4143C17.7893 5.03928 18 4.53064 18 4.00029C18 3.46993 17.7893 2.96129 17.4143 2.58627C17.0393 2.21125 16.5306 2.00057 16.0003 2.00057C15.4699 2.00057 14.9613 2.21125 14.5863 2.58627C14.2113 2.96129 14.0006 3.46993 14.0006 4.00029C14.0006 4.53064 14.2113 5.03928 14.5863 5.4143C14.9613 5.78932 15.4699 6 16.0003 6ZM16.0003 8.00057C14.9393 8.00057 13.9219 7.57911 13.1717 6.82891C12.4215 6.07871 12 5.06123 12 4.00029C12 2.93934 12.4215 1.92186 13.1717 1.17166C13.9219 0.421457 14.9393 0 16.0003 0C17.0612 0 18.0787 0.421457 18.8289 1.17166C19.5791 1.92186 20.0006 2.93934 20.0006 4.00029C20.0006 5.06123 19.5791 6.07871 18.8289 6.82891C18.0787 7.57911 17.0612 8.00057 16.0003 8.00057Z'
            fill='#5465FF'
          />
        </svg>
      ),
      title: "Post a Job",
      description:
        "Recruiters post open roles with specific details such as experience level, skills, and job requirements.",
    },
    {
      Icon: () => (
        <svg
          width='20'
          height='20'
          viewBox='0 0 20 20'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path
            d='M10 20C4.47715 20 0 15.5228 0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10C20 15.5228 15.5228 20 10 20ZM10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18ZM11 10H15V12H9V5H11V10Z'
            fill='#5465FF'
          />
        </svg>
      ),
      title: "Reduce Time-to-Hire by 70%",
      description:
        "Tiaago’s engine automatically screens resumes, validates experience, and ranks candidates based on skill match and relevance.",
    },
    {
      Icon: () => (
        <svg
          width='18'
          height='20'
          viewBox='0 0 18 20'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path
            d='M6 0.00318003V0H16.9978C17.5513 0 18 0.45531 18 0.9918V19.0082C18 19.556 17.5551 20 17.0066 20H0.9934C0.44476 20 0 19.5501 0 18.9932V6L6 0.00318003ZM2.82918 6H6V2.83086L2.82918 6ZM8 2V7C8 7.55228 7.5523 8 7 8H2V18H16V2H8Z'
            fill='#5465FF'
          />
        </svg>
      ),
      title: "AI-Generated Assessment",
      description:
        " Candidates who pass resume screening receive personalized, role-specific assessments (MCQ or code-based).",
    },
    {
      Icon: () => (
        <svg
          width='18'
          height='20'
          viewBox='0 0 18 20'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path
            d='M13.9998 14H15.9998V2H5.9998V4H13.9998V14ZM13.9998 16V18.9991C13.9998 19.5519 13.5498 20 12.9929 20H1.00666C0.4506 20 0 19.5554 0 18.9991L0.00259995 5.00087C0.00270995 4.4481 0.45264 4 1.00942 4H3.9998V1C3.9998 0.44771 4.44752 0 4.9998 0H16.9998C17.5521 0 17.9998 0.44771 17.9998 1V15C17.9998 15.5523 17.5521 16 16.9998 16H13.9998ZM2.00242 6L2.00019 18H11.9998V6H2.00242ZM3.9998 14H8.49982C8.77592 14 8.99982 13.7761 8.99982 13.5C8.99982 13.2239 8.77592 13 8.49982 13H5.4998C4.11909 13 2.9998 11.8807 2.9998 10.5C2.9998 9.11929 4.11909 7.99999 5.4998 7.99999H5.9998V7H7.99982V7.99999H9.99982V9.99999H5.4998C5.22366 9.99999 4.9998 10.2239 4.9998 10.5C4.9998 10.7761 5.22366 11 5.4998 11H8.49982C9.88052 11 10.9998 12.1193 10.9998 13.5C10.9998 14.8807 9.88052 16 8.49982 16H7.99982V17H5.9998V16H3.9998V14Z'
            fill='#5465FF'
          />
        </svg>
      ),
      title: "Pre-Screening Interview (AI Voice)",
      description:
        "Recruiters can enable automated voice-based interviews to evaluate communication and reasoning skills.",
    },
  ],
  list: [
    "Post job",
    "Generate Unique URL Link 🔗",
    "Candidate Applies Resume submitted through platform",
    "AI Screening & Assessment Automated screening and tests",
    "Assessment Results Recruiter reviews ranked candidates",
    "AI Voice Interview Evaluates communication skills",
    "Assessment Results Ranked candidates with scores",
  ],
};

const features = {
  core: [
    {
      title: "AI Resume Screening",
      description:
        "AI evaluates resumes for role match, experience, and qualification strength.",
    },
    {
      title: "AI Skill Assessment",
      description: "AI generates domain-specific assessments (MCQ or coding).",
    },
    {
      title: "Pre-Screening Interview (AI Voice)",
      description:
        "AI conducts a voice-based pre-screening interview for communication and logic evaluation.",
    },
    {
      title: "Sourcing Engine",
      description:
        "Intelligent sourcing from external platforms and internal databases.",
    },
    {
      title: "Integrations",
      description:
        "Connect to tools like LinkedIn Recruiter, Workday, Zoho Recruit, Greenhouse, and Smart Recruiters.",
    },
    {
      title: "AI Feedback Dashboard",
      description:
        "Breakdown of AI analysis, strengths, and improvement points per candidate.",
    },
  ],
  others: [
    { title: "AI Recommendation Engine", color: "#5465FF" },
    { title: "Job Management", color: "#5465FF" },
    { title: "Recruiter Public Page", color: "#5465FF" },
    { title: "Assessment Module", color: "#5465FF" },
    { title: "Recruiter Dashboard", color: "#5465FF" },
  ],
};

const CORE_FEATURE_ICONS = [FileSearch, ClipboardCheck, Mic, Radar, Plug, BarChart3];

const Recruiters = () => {
  return (
    <>
      <main className='min-h-screen bg-white'>
        {/* Hero Section */}
        <section className='relative overflow-hidden pb-[58px] md:pb[97px] bg-[linear-gradient(180deg,#2563EB_0%,#4E80EE_16.33%,#5F8CF0_22.22%,#6D97F1_27.02%,#7AA0F2_31.05%,#86A8F3_34.65%,#90B0F4_38.12%,#9BB7F5_41.78%,#A5BFF6_45.97%,#B0C6F7_51%,#BCCFF8_57.19%,#C9D9FA_64.86%,#D9E3FB_74.34%,#EAF0FD_85.95%,#FFFFFF_100%)]'>
          {/* <div className='absolute inset-0 bg-grid-pattern opacity-[0.02]' /> */}
          <Image
            src='/assets/Meteor - Frame.svg'
            alt='Hero image'
            className='object-cover'
            fill
            priority
          />

          <div className='md:container mx-auto pt-[77px] md:pt-[142px] px-4 sm:px-6 lg:px-8 mt-[84px] relative border-x border-white/10'>
            <div className='max-w-5xl mx-auto text-center'>
              <h1 className='text-[32px] md:text-5xl font-bold md:font-semibold text-white mb-2 font-onest'>
                Your next hire is already in your pipeline.
              </h1>

              <p className='text-lg md:text-lg max-md:font-medium text-white/70 font-onest mb-8 sm:mb-10 max-w-3xl mx-auto px-4 sm:px-0'>
                Tiaago screens resumes, generates assessments, and surfaces your
                best candidates automatically so you spend more time making
                placements and less time reading CVs.
              </p>

              <div className='flex gap-3 sm:gap-4 justify-center'>
                <CustomAuthButton className='!rounded-full font-semibold text-sm font-onest py-2.5 px-4'>
                  Sign up for Free
                </CustomAuthButton>
                <CustomButton
                  variant='outline'
                  className='!rounded-full bg-white text-sm font-onest py-2.5 px-4'
                >
                  <a
                    href='https://cal.com/tiaago/book-a-demo-tiaago-ai-hiring-platform'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center'
                  >
                    Book a demo
                  </a>
                </CustomButton>
              </div>
            </div>

            <div className='bg-[#0A0A0A0A] p-2 md:p-3 rounded-xl mt-[95px]'>
              <div className='relative w-full rounded-xl overflow-hidden shadow-2xl' style={{ aspectRatio: "16 / 9" }}>
                <iframe
                  src='https://www.youtube.com/embed/_QLWQnn2hSs'
                  title='Tiaago product walkthrough'
                  className='absolute inset-0 w-full h-full rounded-xl border-0'
                  allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                  allowFullScreen
                  loading='lazy'
                />
              </div>
            </div>
          </div>
        </section>

        {/* How Tiaago Works Section */}
        <section className='py-11 md:pt-[124px] bg-white'>
          <div className='md:container mx-auto px-4 lg:px-6 xl:px-8'>
            <div className='max-w-5xl mx-auto text-center mb-20 md:mb-[100px]'>
              <p className='text-sm text-primary font-jetbrains-mono mb-4 max-w-3xl mx-auto px-4 sm:px-0'>
                How Tiaago Works
              </p>
              <h2 className='text-2xl sm:text-4xl md:text-5xl font-semibold text-[#110000] mb-3.5 md:mb-2 font-onest'>
                Automated hiring software for the entire candidate journey
              </h2>

              <p className='text-sm text-[#0A0A0AB2] font-onest max-w-3xl mx-auto px-4 sm:px-0'>
                Tiaago simplifies and supercharges your hiring pipeline. Here’s
                how our AI-powered system works from job post to offer ready
                shortlist.
              </p>
            </div>

            <div className='border border-[#0A0A0A1A] rounded-xl p-8 pb-0'>
              <svg
                width='28'
                height='28'
                viewBox='0 0 28 28'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <g clipPath='url(#clip0_364_3946)'>
                  <g clipPath='url(#clip1_364_3946)'>
                    <path
                      d='M15.165 9.33301V18.667C15.165 19.5953 14.7963 20.4855 14.1399 21.1419C13.4835 21.7983 12.5933 22.167 11.665 22.167H9.13303C8.85735 22.9451 8.3156 23.6008 7.60345 24.0182C6.89129 24.4356 6.05453 24.588 5.24094 24.4484C4.42735 24.3088 3.68925 23.8862 3.15699 23.2552C2.62473 22.6242 2.33255 21.8255 2.33203 21C2.33184 20.1743 2.62361 19.375 3.15576 18.7436C3.68792 18.1122 4.42617 17.6893 5.24002 17.5496C6.05387 17.41 6.8909 17.5625 7.60312 17.9804C8.31534 18.3982 8.85689 19.0544 9.13203 19.833H11.665C12.31 19.833 12.832 19.311 12.832 18.667V9.33301C12.832 8.40475 13.2008 7.51451 13.8572 6.85813C14.5135 6.20176 15.4038 5.83301 16.332 5.83301H19.832V2.33301L25.665 7.00001L19.832 11.667V8.16701H16.332C15.688 8.16701 15.165 8.68901 15.165 9.33301ZM5.83203 22.167C6.14154 22.167 6.43837 22.0441 6.65723 21.8252C6.87608 21.6063 6.99903 21.3095 6.99903 21C6.99903 20.6905 6.87608 20.3937 6.65723 20.1748C6.43837 19.956 6.14154 19.833 5.83203 19.833C5.52252 19.833 5.22569 19.956 5.00684 20.1748C4.78798 20.3937 4.66503 20.6905 4.66503 21C4.66503 21.3095 4.78798 21.6063 5.00684 21.8252C5.22569 22.0441 5.52252 22.167 5.83203 22.167Z'
                      fill='#5465FF'
                    />
                  </g>
                </g>
                <defs>
                  <clipPath id='clip0_364_3946'>
                    <rect width='28' height='28' fill='white' />
                  </clipPath>
                  <clipPath id='clip1_364_3946'>
                    <rect width='28' height='28' fill='white' />
                  </clipPath>
                </defs>
              </svg>

              <h4 className='text-[#1D1D1D] mt-3.5 mb-2.5 md:mt-3 md:mb-3 font-semibold text-sm md:text-lg'>
                For Staffing Agencies
              </h4>

              <p className='text-[#0A0A0AB2] text-sm md:text-base'>
                Source top quality candidates for your clients in no time.
              </p>

              <div className='bg-[#0A0A0A0A] p-2 md:p-3 pb-0 md:pb-0 rounded-t-xl mt-[108px]'>
                <Image
                  src='/assets/images/home/staffing agencies.png'
                  alt='Hero image'
                  className='object-cover rounded-t-xl w-full'
                  width={1292}
                  height={500}
                />
              </div>
            </div>

            <div className='mt-6 md:mt-8 grid md:grid-cols-2 gap-6 md:gap-8'>
              <div className='border border-[#0A0A0A1A] rounded-xl p-8 pb-0'>
                <svg
                  width='24'
                  height='24'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M4.08167 23.033C3.32452 23.0328 2.58235 22.822 1.93809 22.4242C1.29383 22.0265 0.772853 21.4574 0.433383 20.7806C0.0939116 20.1038 -0.050685 19.346 0.015749 18.5918C0.0821831 17.8375 0.357031 17.1166 0.809582 16.5096C1.26213 15.9026 1.87456 15.4333 2.57843 15.1543C3.2823 14.8753 4.04989 14.7975 4.79543 14.9296C5.54097 15.0617 6.23509 15.3986 6.80023 15.9024C7.36537 16.4063 7.77926 17.0574 7.99567 17.783H14.5817V15.45H16.9157V8.734L14.2987 6.116H7.58167V8.45H0.581673V1.45H7.58167V3.783H14.2987L18.0817 0L23.0317 4.95L19.2487 8.732V15.449L21.5817 15.45V22.45H14.5817V20.116L7.99667 20.117C7.74498 20.9597 7.22802 21.6987 6.52265 22.2241C5.81729 22.7495 4.9612 23.0332 4.08167 23.033ZM4.08167 17.2C3.61754 17.2 3.17243 17.3844 2.84424 17.7126C2.51605 18.0408 2.33167 18.4859 2.33167 18.95C2.33167 19.4141 2.51605 19.8592 2.84424 20.1874C3.17243 20.5156 3.61754 20.7 4.08167 20.7C4.5458 20.7 4.99092 20.5156 5.31911 20.1874C5.6473 19.8592 5.83167 19.4141 5.83167 18.95C5.83167 18.4859 5.6473 18.0408 5.31911 17.7126C4.99092 17.3844 4.5458 17.2 4.08167 17.2ZM19.2487 17.783H16.9157V20.117H19.2487V17.783ZM18.0817 3.3L16.4317 4.95L18.0817 6.6L19.7317 4.95L18.0817 3.3ZM5.24867 3.783H2.91567V6.117H5.24867V3.783Z'
                    fill='#5465FF'
                  />
                </svg>

                <h4 className='text-[#1D1D1D] mt-3.5 mb-2.5 md:mt-3 md:mb-3 font-semibold text-sm md:text-lg'>
                  For Internal HR Teams
                </h4>

                <p className='text-[#0A0A0AB2] text-sm md:text-base'>
                  Recruit the right people and build an unbeatable workforce.
                </p>

                <Image
                  src='/assets/images/home/internal hr teams.png'
                  alt='Hero image'
                  className='object-cover rounded-t-xl mt-[108px]'
                  width={706}
                  height={358}
                />
              </div>
              <div className='border border-[#0A0A0A1A] rounded-xl p-8 pb-0'>
                <svg
                  width='25'
                  height='24'
                  viewBox='0 0 25 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M15.167 2.844C15.9211 2.84373 16.6442 2.54398 17.1774 2.01066C17.7105 1.47733 18.01 0.754102 18.01 0H19.323C19.323 0.754276 19.6226 1.47766 20.156 2.01101C20.6893 2.54437 21.4127 2.844 22.167 2.844V4.157C21.4129 4.157 20.6897 4.4565 20.1563 4.98963C19.623 5.52277 19.3233 6.2459 19.323 7H18.01C18.01 6.2459 17.7105 5.52267 17.1774 4.98934C16.6442 4.45602 15.9211 4.15627 15.167 4.156V2.844ZM0 10.5C1.85652 10.5 3.63699 9.7625 4.94975 8.44975C6.2625 7.13699 7 5.35652 7 3.5H9.333C9.333 5.35652 10.0705 7.13699 11.3833 8.44975C12.696 9.7625 14.4765 10.5 16.333 10.5V12.834C14.4765 12.834 12.696 13.5715 11.3833 14.8843C10.0705 16.197 9.333 17.9775 9.333 19.834H7C7 17.9775 6.2625 16.197 4.94975 14.8843C3.63699 13.5715 1.85652 12.834 0 12.834V10.5ZM4.522 11.667C6.05363 12.5177 7.31633 13.7804 8.167 15.312C9.0174 13.7805 10.2797 12.5178 11.811 11.667C10.2797 10.8162 9.01735 9.55352 8.167 8.022C7.31638 9.55366 6.05366 10.8164 4.522 11.667ZM18.958 14C18.958 15.0055 18.5586 15.9699 17.8477 16.681C17.1368 17.3921 16.1725 17.7917 15.167 17.792V19.542C16.1725 19.5423 17.1368 19.9419 17.8477 20.653C18.5586 21.3641 18.958 22.3285 18.958 23.334H20.708C20.708 22.3283 21.1075 21.3638 21.8187 20.6527C22.5298 19.9415 23.4943 19.542 24.5 19.542V17.792C24.002 17.792 23.5089 17.6939 23.0489 17.5034C22.5888 17.3128 22.1708 17.0335 21.8187 16.6813C21.4665 16.3292 21.1872 15.9112 20.9966 15.4511C20.8061 14.9911 20.708 14.498 20.708 14H18.958Z'
                    fill='#5465FF'
                  />
                </svg>

                <h4 className='text-[#1D1D1D] mt-3.5 mb-2.5 md:mt-3 md:mb-3 font-semibold text-sm md:text-lg'>
                  For Job Seekers
                </h4>

                <p className='text-[#0A0A0AB2] text-sm md:text-base'>
                  Tiaago connects you with the right opportunities.
                </p>

                <Image
                  src='/assets/images/home/job seeker.png'
                  alt='Hero image'
                  className='object-cover rounded-t-xl mt-[108px] mx-auto'
                  width={580}
                  height={388}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Tiaago Requirements Section */}
        <section className='py-11 md:pt-[124px] bg-white'>
          <div className='md:container mx-auto px-4 lg:px-6 xl:px-8 grid md:grid-cols-2 gap-[60px] md:gap-10 justify-between'>
            <div className='md:max-w-[630px]'>
              <p className='text-sm text-primary font-jetbrains-mono mb-2 max-w-3xl mx-auto px-4 sm:px-0'>
                RECRUITMENT
              </p>
              <h2 className='text-2xl sm:text-4xl md:text-[40px] font-semibold text-black mb-[62px] md:mb-10 font-onest'>
                How Tiaago Works
              </h2>

              <div className='grid md:grid-cols-2 gap-10 md:gap-12'>
                {requirements.cards.map((card, index) => (
                  <div key={index} className='pt-3.5 relative'>
                    {/* Vertical divider */}
                    <div
                      className={cn(
                        "absolute -left-6 top-0 h-full w-[1px] bg-[#F2F3F4] max-md:hidden",
                        index % 2 === 0 && "hidden"
                      )}
                    />
                    <card.Icon />
                    <h3 className='text-black mt-3.5 mb-2 md:mt-6.5 md:mb-3 font-onest font-semibold text-lg'>
                      {card.title}
                    </h3>
                    <p className='text-[#5F6264] text-sm font-onest'>
                      {card.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <AnimatedList requirements={requirements.list} />
          </div>
        </section>

        {/* Tiaago core features */}
        <section className='bg-[#000215] pt-12 md:pt-[100px] pb-[85px] md:pb-[140px] mt-20 md:mt-[118px] relative'>
          <Image
            src='/assets/images/home/Background pattern.png'
            alt='Background pattern'
            className='object-cover'
            fill
          />

          <div className='md:container mx-auto px-4 lg:px-6 xl:px-8 relative'>
            <div className='max-w-2xl mx-auto flex flex-col items-center'>
              <h2 className='text-3xl md:text-5xl font-semibold text-white text-center mb-4 font-onest'>
                Empower Your Workflow with Tiaago
              </h2>
              <p className='text-[#BDC3C7] text-center font-onest font-medium text-sm md:text-base'>
                Manage multiple roles from one dashboard and showcase them on
                your dedicated public page. Each recruiter gets a shareable link
                to display all active positions
              </p>
              <CustomAuthButton className='!rounded-full font-semibold text-base font-onest py-2.5 px-4 mt-5 md:mt-3'>
                Get Started
              </CustomAuthButton>
            </div>

            <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-5 my-[95px] md:my-[100px]'>
              {features.core.map((feature, index) => {
                const Icon = CORE_FEATURE_ICONS[index];
                return (
                  <div
                    key={index}
                    className='rounded-2xl border border-white/10 bg-[#0B0F1A] p-6 transition-colors hover:border-primary/40'
                  >
                    <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 mb-5'>
                      <Icon className='h-5 w-5 text-primary' />
                    </div>
                    <h3 className='text-white mb-2 font-onest font-medium text-base md:text-lg'>
                      {feature.title}
                    </h3>
                    <p className='text-[#9CA3AF] text-sm font-onest'>{feature.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Other Features */}
            <div className='flex items-center gap-2 md:gap-6 mb-6'>
              <div className='flex-1 flex items-center'>
                <hr className='flex-1 h-[1px] border-white/10' />
                <div className='w-2 h-2 bg-[#2E2E2E] rounded-full' />
              </div>
              <div className='p-px bg-primary w-fit rounded-lg'>
                <div className='text-xs md:text-sm font-medium text-white font-jetbrains-mono px-3.5 py-2.5 bg-[#1E1E1E] rounded-lg'>
                  Other Interesting Features
                </div>
              </div>
              <div className='flex-1 flex items-center'>
                <div className='w-2 h-2 bg-[#2E2E2E] rounded-full' />
                <hr className='flex-1 h-[1px] border-white/10' />
              </div>
            </div>

            <AnimatedOtherInterestingFeatures features={features.others} />
          </div>
        </section>

        {/* Tiaago Integrations Section */}
        <section className='mt-[84px] md:pt-[124px] bg-white'>
          <div className='md:container mx-auto px-4 lg:px-6 xl:px-8'>
            <div className='max-w-[536px] mx-auto text-center mb-20 md:mb-[100px]'>
              <p className='text-sm text-primary uppercase font-jetbrains-mono mb-4 max-w-3xl mx-auto px-4 sm:px-0'>
                Integrations
              </p>
              <h2 className='text-2xl sm:text-4xl md:text-5xl font-semibold text-[#110000] mb-3.5 md:mb-2 font-onest'>
                Connect with the our seamless integrations
              </h2>

              <p className='text-sm text-[#0A0A0AB2] font-onest max-w-3xl mx-auto px-4 sm:px-0'>
                Tiaago connects with the tools recruiters already use:
              </p>
            </div>

            <div className='mt-20 pb-7 rounded-xl integrations-shadow bg-[radial-gradient(75%_89%_at_47.3%_26.4%,rgba(255,255,255,0.7)_62.36%,#F4F5FF_100%)] flex justify-center'>
              <IntegrationsMarquee />
            </div>
          </div>
        </section>

        <Testimonials />

        <FAQ />

        <section className='my-20 bg-white px-4'>
          <div className='max-w-[1200px] mx-auto bg-[linear-gradient(180deg,#FFFFFF_4%,#F4F5FF_100%)] pt-[169px] pb-[105px] md:pt-[120px] md:pb-[154px] rounded-lg'>
            <div className='flex flex-col items-center'>
              <div className='flex items-center gap-2'>
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 20 20'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <rect width='20' height='20' rx='4' fill='#5465FF' />
                  <g clipPath='url(#clip0_436_4244)'>
                    <path
                      d='M12.2249 9.99997C13.4539 9.99997 14.4509 10.998 14.4509 12.229C14.4509 13.459 13.4539 14.457 12.2249 14.457H7.77287C6.54387 14.457 5.54688 13.459 5.54688 12.229C5.54688 10.998 6.54387 9.99997 7.77287 9.99997C6.54387 9.99997 5.54688 9.00197 5.54688 7.77097C5.54688 6.54097 6.54387 5.54297 7.77287 5.54297H12.2249C13.4539 5.54297 14.4509 6.54097 14.4509 7.77097C14.4509 9.00197 13.4539 9.99997 12.2249 9.99997Z'
                      fill='white'
                    />
                  </g>
                  <defs>
                    <clipPath id='clip0_436_4244'>
                      <rect
                        width='9'
                        height='9'
                        fill='white'
                        transform='translate(5.5 5.5)'
                      />
                    </clipPath>
                  </defs>
                </svg>

                <h6 className='text-black font-onest font-medium text-xs'>
                  Automate with TIAAGO
                </h6>
              </div>
              <h3 className='text-2xl md:text-[40px] font-medium font-onest text-[#22242A] mt-5 mb-4 w-[260px] md:w-[610px] text-center'>
                The modern hiring infrastructure recruiters have been waiting
                for
              </h3>
              <CustomAuthButton className='!rounded-full font-semibold text-sm font-onest py-2.5 px-4'>
                Sign up for Free
              </CustomAuthButton>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Recruiters;
