import { HiOutlineChatBubbleOvalLeftEllipsis } from "react-icons/hi2";

import { CertificationDisplay } from "../settings/components/Tabs/ProfileTab/Certifications";

import { BASE_URL } from "@/app/common/constants";
import { getPortfolio } from "@/app/common/services/talents";
import { getCurrentUser } from "@/app/common/services/profile";
import PortfolioBannerEdit from "./_components/PortfolioBannerEdit";
import TalentToolDisplay from "@/app/common/components/TalentToolDisplay";
import { AvatarWithVerifiedBadge } from "@/app/common/components/UserAvatar";
import WorkExperienceDisplay from "@/app/common/components/WorkExperienceDisplay";
import TalentEducationDisplay from "@/app/common/components/TalentEducationDisplay";
import SetTalentProfile from "@/app/talents/(dashboard)/components/SetTalentProfile";
import CopyToClipboard from "@/app/common/components/CopyToClipboard";
import CustomBadge from "@/app/common/components/CustomBadge";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";
import ProjectDisplay from "@/app/common/components/ProjectDisplay";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";
import { getAssessmentCerts } from "@/app/common/services/assessment";

export const metadata = { title: "Portfolio" };

const TalentPortfolioPage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const currentUser = (await getCurrentUser("talent")).currentUser;
  const portfolioRes = await getPortfolio().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get portfolio error (portfolio page): ", error);
    errors.push({
      message: error,
      title: "Error getting portfolio",
    });
    return undefined;
  });
  const talentCertsRes = await getAssessmentCerts().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get certificates error (talent portfolio): ", error);
    errors.push({
      message: error,
      title: "Error getting certificates",
    });
    return {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };
  });
  const certificates = talentCertsRes.results;
  const portfolio = portfolioRes?.data;


  return (
    <>
      <DisplayErrorMessages errors={errors} />
      {!!portfolio && (
        <>
          <SetTalentProfile profile={currentUser} portfolio={portfolio} />
          <div className='border-b w-full border-gray-200 pb-1 mb-8'>
            <h1 className='text-2xl font-semibold mb-1 text-primary-black'>
              Portfolio
            </h1>
            <p className='text-secondary-black text-base'>
              Manage your preferences
            </p>
          </div>
          <div className='relative h-[200px]'>
            <PortfolioBannerEdit banner={portfolio?.banner} />
            <AvatarWithVerifiedBadge
              profilePic={currentUser?.profile_pic}
              firstName={currentUser?.first_name}
              lastName={currentUser?.last_name}
              verified={currentUser?.has_passed_assessment}
              className='w-20 bg-gray-400'
              containerClass='absolute bottom-0 left-0 z-[2] translate-y-10'
              size={32}
              forCurrentUser
            />
          </div>

          <div className='mt-[47px]'>
            <div className='flex items-start justify-between'>
              <div>
                <h2 className='text-2xl font-bold mb-1 text-primary-black'>
                  {currentUser?.first_name} {currentUser?.last_name}
                </h2>
                <p className='text-secondary-black text-sm'>
                  {currentUser?.country ?? "Nigeria"}
                </p>
                <CustomBadge
                  text={currentUser.role}
                  className='mt-2 capitalize font-medium whitespace-nowrap bg-[#EDF8FF] text-[#3580B5]'
                  hideDot
                />
              </div>

              <div className='flex items-center'>
                <button className='btn btn-ghost bg-white border-[#D0D5DD] border text-base text-[#344054] font-medium'>
                  <HiOutlineChatBubbleOvalLeftEllipsis className='text-xl text-[#141B34]' />
                  Message
                </button>
                <CopyToClipboard
                  text={`${BASE_URL}/talents/${portfolio?.slug}/portfolio`}
                  className='btn btn-primary ml-4 text-white'
                />
                {/* <ShareButton
              data={{
                text: "Check out my portfolio",
                url: `${BASE_URL}/talents/${portfolio?.slug}/portfolio`,
                title: `${currentUser?.first_name} ${currentUser?.last_name}'s Portfolio`,
              }}
            >
              <button className='btn btn-primary ml-4'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='21'
                  height='21'
                  viewBox='0 0 21 21'
                  fill='none'
                >
                  <path
                    d='M5.48193 8.5C4.791 8.50511 4.37524 8.52628 4.04408 8.61397C2.53686 9.01307 1.50497 10.3639 1.54559 11.8847C1.55736 12.3252 1.72505 12.8696 2.06043 13.9585C2.86757 16.579 4.22407 18.8539 7.26288 19.3997C7.82147 19.5 8.45004 19.5 9.70717 19.5L11.3817 19.5C12.6388 19.5 13.2674 19.5 13.826 19.3997C16.8648 18.8539 18.2213 16.579 19.0284 13.9585C19.3638 12.8696 19.5315 12.3252 19.5433 11.8847C19.5839 10.3639 18.552 9.01307 17.0448 8.61397C16.7136 8.52628 16.2979 8.50511 15.6069 8.5'
                    stroke='white'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                  />
                  <path
                    d='M10.5444 1.5L10.5444 12.5M10.5444 1.5C11.0128 1.5 11.3688 1.9381 12.0809 2.8143L13.0444 4M10.5444 1.5C10.0761 1.5 9.72004 1.9381 9.00799 2.8143L8.04443 4'
                    stroke='white'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </button>
            </ShareButton> */}
              </div>
            </div>
          </div>

          <article className='mt-[50px] mb-11'>
            <h4 className='text-lg font-semibold mb-1 text-primary-black'>
              About
            </h4>
            <p className='text-[#667085] text-sm border-b w-full border-gray-200 pb-1'>
              A peek into your career profile
            </p>

            <div
              className='mt-6 text-base text-[#1F2C39]'
              dangerouslySetInnerHTML={{
                __html:
                  portfolio.about ?? currentUser.bio ?? "Bio not added yet",
              }}
            />
          </article>

          {!!portfolio.tools.length && (
            <>
              <h4 className='mt-[50px] mb-6 text-primary-black font-bold text-base'>
                Tools
              </h4>
              <div className='grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-11'>
                {portfolio.tools.map(tool => (
                  <TalentToolDisplay key={tool.id} tool={tool} />
                ))}
              </div>
            </>
          )}

          <section className='mt-[50px] mb-11'>
            <h4 className='text-lg font-semibold mb-1 text-primary-black'>
              Projects
            </h4>
            <p className='text-[#667085] text-sm border-b w-full border-gray-200 pb-1'>
              List of projects you have added to your portfolio
            </p>

            <div className='mt-6 grid md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-11'>
              {portfolio?.projects?.map((p, i) => (
                <ProjectDisplay key={i} project={p} />
              ))}
              {!portfolio?.projects?.length && (
                <p className='text-sm text-secondary-black'>
                  No projects added yet.
                </p>
              )}
            </div>
          </section>

          <div className='w-full rounded-t-lg pl-6 pr-2 h-20 bg-[#EBECEE] border-b border-[#F5F5F5] mt-8 flex items-center justify-between'>
            <h2 className='text-base font-semibold'>Experience</h2>
          </div>
          <div className='border border-t-0 rounded-b-lg grid lg:grid-cols-2 px-6 py-[45px] gap-y-[45px] gap-x-[60px]'>
            {portfolio.experience.map(we => (
              <WorkExperienceDisplay experience={we} key={we.id} />
            ))}
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

          <div className='grid lg:grid-cols-2 gap-[78px]'>
            <div>
              <div className='w-full rounded-t-lg pl-6 pr-2 h-20 bg-[#EBECEE] border-b border-[#F5F5F5] mt-8 flex items-center justify-between'>
                <h2 className='text-base font-semibold'>Education</h2>
              </div>
              <div className='border border-t-0 rounded-b-lg p-6 pt-[45px] space-y-11'>
                {portfolio.education.map(edu => (
                  <TalentEducationDisplay key={edu.id} education={edu} />
                ))}
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
            </div>

            <div>
              <div className='w-full rounded-t-lg pl-6 pr-2 h-20 bg-[#EBECEE] border-b border-[#F5F5F5] mt-8 flex items-center justify-between'>
                <h2 className='text-base font-semibold'>Certifications</h2>
              </div>
              <div className='border border-t-0 rounded-b-lg space-y-5 px-6 py-4'>
                {certificates.map((cert, i) => (
                  <CertificationDisplay certification={cert} key={i} />
                ))}
                {!certificates.length && (
                  <EmptyStateV3
                    imgSrc='/assets/icons/cert-empty-state.svg'
                    imgHeight={150}
                    imgWidth={150}
                    text='No Certificate'
                    subText='No certificates provided yet'
                    className='pt-0 pb-2'
                  />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default TalentPortfolioPage;
