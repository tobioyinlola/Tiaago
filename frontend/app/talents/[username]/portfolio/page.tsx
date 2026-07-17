import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { HiOutlineChatBubbleOvalLeftEllipsis } from "react-icons/hi2";

import UserAvatar, {
  AvatarWithVerifiedBadge,
} from "@/app/common/components/UserAvatar";

import { CertificationDisplay } from "@/app/talents/(dashboard)/settings/components/Tabs/ProfileTab/Certifications";

import {
  cn,
  getFullUserType,
  handleServerApiCallError,
} from "@/app/common/utils";
import BrandLink from "@/app/common/components/BrandLink";
import ScrollArea from "@/app/common/components/ScrollArea";
import { getCurrentUser } from "@/app/common/services/profile";
import { ALLOW_NULL_ARGS } from "@/app/common/constants";
import { getTalentPortfolio } from "@/app/common/services/talents";
import TalentToolDisplay from "@/app/common/components/TalentToolDisplay";
import WorkExperienceDisplay from "@/app/common/components/WorkExperienceDisplay";
import TalentEducationDisplay from "@/app/common/components/TalentEducationDisplay";
import CustomBadge from "@/app/common/components/CustomBadge";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";
import ProjectDisplay from "@/app/common/components/ProjectDisplay";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { getTalentAssessmentCerts } from "@/app/common/services/assessment";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const result = await getTalentPortfolio(username).catch(() => null);
  if (!result?.success || !result.data)
    return { title: "Talent Portfolio" };
  const p = result.data;
  const title = `${p.full_name} - ${p.role?.title ?? "Tech Talent"}`;
  const description = p.about
    ? p.about.slice(0, 160)
    : `View ${p.full_name}'s portfolio on TIAAGO.`;
  return {
    title,
    description,
    openGraph: { title, description, siteName: "TIAAGO", type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

const TalentPublicPortfolioPage = async ({
  params,
}: {
  params: Promise<{ username: string }>;
}) => {
  const { username } = await params;
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const currentUser = (await getCurrentUser(undefined, ALLOW_NULL_ARGS))
    .currentUser;
  const portfolioRes = await getTalentPortfolio(username).catch(() => {
    notFound();
  });
  if (!portfolioRes.success) notFound();
  const portfolio = portfolioRes.data!;
  const [firstName, lastName] = portfolio.full_name.split(" ") ?? [];
  const as = getFullUserType(currentUser?.user_type);
  const dashboardLink =
    as === "staff"
      ? "/admin"
      : `/${as || "talent"}s${as === "recruiter" ? "/dashboard" : ""}`;
  const certificates = await getTalentAssessmentCerts(username).catch(
    async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get certificates error (talent public portfolio): ", error);
      errors.push({
        message: error,
        title: "Error getting certificates",
      });
      return [];
    }
  );
  return (
    <div className='bg-[#F8F9FA] min-h-[100svh] font-poppins'>
      <DisplayErrorMessages errors={errors} />
      <header
        className={cn(
          "flex justify-between items-center max-lg:bg-deep-blue lg:border-b border-outline px-9 h-20"
          //   as === "talent" && "max-lg:bg-white max-lg:border-b",
          //   className
        )}
      >
        <BrandLink className='max-lg:fill-white hover:fill-primary' />

        <div className='flex items-center gap-4 lg:gap-6 max-lg:hidden'>
          {currentUser ? (
            <Link href={`${dashboardLink}/settings?tab=profile`}>
              <UserAvatar
                forCurrentUser
                profilePic={currentUser?.profile_pic}
                firstName={currentUser?.first_name}
                lastName={currentUser?.last_name}
              />
            </Link>
          ) : (
            <Link
              href={dashboardLink.replace("/dashboard", "") + "/signin"}
              className='btn btn-primary btn-outline'
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      <ScrollArea className='h-[calc(100svh-5rem)] flex-1 px-3 md:px-8 bg-[#F8F9FA]'>
        <div className='h-3 md:h-5' />
        <div className='relative h-[200px]'>
          <Image
            src={
              portfolio?.banner ?? "/assets/images/default-portfolio-banner.png"
            }
            alt='Portfolio Banner'
            fill
            className='object-cover object-center rounded-lg'
          />
          <AvatarWithVerifiedBadge
            profilePic={portfolio.profile_picture}
            firstName={firstName}
            lastName={lastName}
            verified={portfolio.is_verified}
            className='w-20 bg-gray-400'
            containerClass='absolute bottom-0 left-0 z-[2] translate-y-10'
            size={32}
            forCurrentUser
          />
        </div>

        <div className='mt-[47px]'>
          <div className='flex max-sm:flex-col sm:items-start gap-6 justify-between'>
            <div>
              <h2 className='text-2xl font-bold mb-1 text-primary-black'>
                {portfolio.full_name}
              </h2>
              <p className='text-secondary-black text-sm'>
                {portfolio.country ?? "Nigeria"}
              </p>
              <CustomBadge
                text={portfolio.role?.title ?? "Talent role"}
                className='mt-2 capitalize font-medium whitespace-nowrap bg-[#EDF8FF] text-[#3580B5]'
                hideDot
              />
            </div>

            {!!(!currentUser || currentUser?.user_type === "CR") && (
              <Link
                href={{
                  pathname: "/recruiter/dashboard/messages",
                  // query: { user: user.id },
                }}
                className='btn btn-ghost w-fit bg-white border-[#D0D5DD] border text-base text-primary font-medium'
              >
                <HiOutlineChatBubbleOvalLeftEllipsis className='text-xl' />
                Message on Tiaago
              </Link>
            )}
          </div>
        </div>

        <article className='mt-[50px] mb-11 bg-white rounded-lg px-5 py-4'>
          <h4 className='text-lg font-semibold mb-3 text-primary-black'>
            About
          </h4>

          <div
            className='text-sm text-[#727E8A]'
            dangerouslySetInnerHTML={{
              __html: portfolio.about ?? "Bio not added yet",
            }}
          />
        </article>

        <div className='grid lg:grid-cols-2 gap-8 lg:gap-7 items-start'>
          <div className='space-y-6'>
            <div className='bg-white rounded-lg px-5 py-4'>
              <div className='w-full flex items-center justify-between mb-5'>
                <h2 className='text-base font-bold text-primary-black'>
                  Experience
                </h2>
              </div>
              <div className='max-lg:max-w-[calc(100svw_-_1.5rem)] grid gap-8 lg:gap-10'>
                {portfolio.experience?.map(we => (
                  <WorkExperienceDisplay experience={we} key={we.id} />
                ))}
              </div>
              {!portfolio.experience.length && (
                <p className='text-sm text-secondary-black'>
                  No experience added yet.
                </p>
              )}
              {!portfolio.experience.length && (
                <EmptyStateV3
                  imgSrc='/assets/icons/event-empty-state.svg'
                  imgHeight={150}
                  imgWidth={150}
                  text='No Experience'
                  subText='No experience provided yet'
                  className='pt-0 pb-2'
                />
              )}
            </div>

            <div className='bg-white rounded-lg px-5 py-4'>
              <div className='w-full flex items-center justify-between mb-5'>
                <h2 className='text-base font-bold text-primary-black'>
                  Projects
                </h2>
              </div>
              <div className='max-lg:max-w-[calc(100svw_-_1.5rem)] grid md:grid-cols-2 gap-8 lg:gap-10'>
                {portfolio.projects?.map(project => (
                  <ProjectDisplay project={project} key={project.id} />
                ))}
              </div>
              {!portfolio.projects?.length && (
                <p className='text-sm text-secondary-black'>
                  No projects added yet.
                </p>
              )}
              {!portfolio.projects?.length && (
                <EmptyStateV3
                  imgHeight={150}
                  imgWidth={150}
                  text='No Projects'
                  subText='No projects provided yet'
                  className='pt-0 pb-2'
                />
              )}
            </div>
          </div>

          <div className='space-y-6'>
            <div className='bg-white rounded-lg px-5 py-4'>
              <h4 className='mb-5 text-primary-black font-bold text-base'>
                Tools
              </h4>
              <div className='grid md:grid-cols-2 gap-4 lg:gap-y-6'>
                {portfolio.tools?.map(tool => (
                  <TalentToolDisplay key={tool.id} tool={tool} />
                ))}
              </div>
              {!portfolio.tools.length && (
                <EmptyStateV3
                  imgSrc='/assets/icons/cert-empty-state.svg'
                  imgHeight={150}
                  imgWidth={150}
                  text='No Tools'
                  subText='No tools provided yet'
                  className='pt-0 pb-2'
                />
              )}
            </div>

            <div className='bg-white rounded-lg px-5 py-4'>
              <h2 className='text-base font-bold text-primary-black mb-6'>
                Education
              </h2>
              <div className='space-y-8'>
                {portfolio.education?.map(edu => (
                  <TalentEducationDisplay key={edu.id} education={edu} />
                ))}
              </div>
              {!portfolio.education.length && (
                <EmptyStateV3
                  imgSrc='/assets/icons/event-empty-state.svg'
                  imgHeight={150}
                  imgWidth={150}
                  text='No Education'
                  subText='No education provided yet'
                  className='pt-0 pb-2'
                />
              )}
            </div>

            <div className='bg-white rounded-lg px-5 py-4'>
              <div className='w-full flex items-center justify-between mb-6'>
                <h2 className='text-base font-bold text-primary-black'>
                  Certifications
                </h2>
              </div>
              <div className='space-y-8'>
                {certificates?.map((cert, i) => (
                  <CertificationDisplay
                    certification={cert}
                    key={i}
                    hideDownload
                  />
                ))}
              </div>
              {!certificates.length && (
                <EmptyStateV3
                  imgSrc='/assets/icons/cert-empty-state.svg'
                  imgHeight={150}
                  imgWidth={150}
                  text='No Certifications'
                  subText='No certificates provided yet'
                  className='pt-0 pb-2'
                />
              )}
            </div>
          </div>
        </div>

        <div className='h-3 md:h-5' />
      </ScrollArea>
    </div>
  );
};

export default TalentPublicPortfolioPage;
