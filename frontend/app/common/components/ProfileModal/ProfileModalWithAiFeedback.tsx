"use client";

import { format } from "date-fns";
import { MdBusiness } from "react-icons/md";
import { Fragment, useEffect, useState } from "react";

import { cn, openModal } from "../../utils";
import Modal, { ModalProps } from "../Modal";
import { EmptyStateV3 } from "../dashboard/EmptyState";
import { AvatarWithVerifiedBadge } from "../UserAvatar";
import { AiFeedbackItem, TalentRole } from "../../types";
import CreateContractModal from "../CreateContractModal";
import { getTalentPortfolio } from "../../services/talents";
import { usePortfolioStore } from "../../store/useWorkExperiences";
import { getTalentAssessmentCerts } from "../../services/assessment";
import { CertificationDisplay } from "@/app/talents/(dashboard)/settings/components/Tabs/ProfileTab/Certifications";
import Link from "next/link";

const colors = [
  {
    bg: "#F9F5FF",
    color: "#6941C6",
  },
  {
    bg: "#EFF8FF",
    color: "#175CD3",
  },
  {
    bg: "#EEF4FF",
    color: "#3538CD",
  },
  {
    bg: "#FDF2FA",
    color: "#C11574",
  },
];

const tabs = ["Profile", "AI Feedback"] as const;
type Tab = (typeof tabs)[number];

const ProfileModalWithAiFeedback = ({
  aiFeedback,
  modalRef,
  online,
  roles,
}: {
  aiFeedback: AiFeedbackItem;
  modalRef: ModalProps["modalRef"];
  online?: boolean;
  roles: TalentRole[];
}) => {
  const portfolioSlug = aiFeedback.portfolio_slug;
  const [activeTab, setActiveTab] = useState<Tab>(tabs[0]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  const { bg, color } = colors[Math.floor(Math.random() * colors.length)];

  const { portfolios, updatePortfolio, certificates, updateCertificates } =
    usePortfolioStore();

  useEffect(() => {
    const fetcPortfolio = async () => {
      setLoadingPortfolio(true);
      const data = await getTalentPortfolio(portfolioSlug);
      if (!data.success) {
        console.log("Error fetching portfolio: ", data.error);
      } else {
        updatePortfolio(data.data!, portfolioSlug);
      }
      const certificates = await getTalentAssessmentCerts(portfolioSlug);
      updateCertificates(certificates ?? [], portfolioSlug);
      setLoadingPortfolio(false);
    };
    fetcPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioSlug]);

  // console.log('user', user)

  const portfolioData = portfolios[portfolioSlug] ?? {};
  const experiences = portfolioData.experience ?? [];
  const userBio = portfolioData.about;
  const [first_name, last_name] = aiFeedback.talent_name.split(" ");
  const userRole = portfolioData.role;
  const certifications = certificates[portfolioSlug] ?? [];

  const overallFeedback =
    aiFeedback.overall_feedback ||
    "Based on the applicant's performance across all stages, including resume analysis, cultural fit assessment, skills evaluation, and pre-screening interview, it is recommended to proceed to the next stage. The applicant demonstrates strong alignment with the required skills for the role and the company's cultural values. Scheduling a final interview is advised to confirm their suitability for the position.";

  return (
    <Modal
      modalRef={modalRef}
      id='profile-modal'
      disablePadding
      disableBorderRadius
      className='md:ml-auto rounded-none md:mr-10'
    >
      <div className='w-[80svw] max-w-md'>
        <div className='flex items-center gap-2 p-6'>
          <AvatarWithVerifiedBadge
            firstName={first_name}
            lastName={last_name}
            verified={portfolioData.is_verified}
            profilePic={aiFeedback.profile_picture}
            className='w-[60px] text-2xl bg-gray-400'
            containerClass='border-4 border-white rounded-full'
            size={24}
          />
          <div>
            <h3 className='text-2xl font-medium text-[#141414] font-switzer'>
              {aiFeedback.talent_name}
            </h3>
            <p className='text-[#3B4045] text-sm'>{aiFeedback.email}</p>
          </div>
        </div>
        {/* Tabs */}
        <div role='tablist' className='tabs tabs-bordered pb-8'>
          {tabs.map(tab => (
            <Fragment key={tab}>
              <div
                role='tab'
                className={cn(
                  "tab !border-gray-200 text-sm font-medium text-gray-500 !w-max",
                  tab === activeTab && "tab-active !border-primary text-primary"
                )}
                aria-label={tab}
                onClick={() => setActiveTab(tab)}
              >
                <span className='md:hidden capitalize'>{tab}</span>
                <span className='max-md:hidden'>{tab}</span>
              </div>
              <div
                role='tabpanel'
                className='tab-content p-6 pb-0 border-0 border-t-2 border-gray-200'
              >
                {tab == "Profile" ? (
                  <>
                    <div className='flex items-center gap-2'>
                      <h3 className='text-base font-medium text-primary-black'>
                        {aiFeedback.talent_name}
                      </h3>
                      <div
                        className={cn(
                          "w-3 h-3 bg-[#12B76A] rounded-full",
                          !online && "bg-gray-400"
                        )}
                      />
                    </div>
                    <p className='text-[#3B4045] text-sm'>{aiFeedback.email}</p>
                    <div className='mt-4'>
                      {!!userRole && (
                        <div
                          className='badge text-xs font-medium capitalize'
                          style={{
                            backgroundColor: bg,
                            color,
                          }}
                        >
                          {userRole.title}
                        </div>
                      )}
                      {!!(portfolioSlug || aiFeedback.portfolio_slug) && (
                        <Link
                          href={`/talents/${
                            portfolioSlug || aiFeedback.portfolio_slug
                          }/portfolio`}
                          className='btn btn-link btn-primary font-medium'
                          target='_blank'
                        >
                          View Portfolio
                        </Link>
                      )}
                    </div>
                    <article className='mb-6 text-sm mt-9' id='about'>
                      <h5 className='text-gray-700 font-medium'>About</h5>
                      <div
                        className='text-gray-500'
                        dangerouslySetInnerHTML={{
                          __html: userBio ?? "Bio not added yet",
                        }}
                      />
                    </article>
                    <h5 className='text-sm text-gray-700 font-medium mt-4'>
                      Work experience
                    </h5>
                    <div className='grid grid-cols-2 gapx-8 gap-y-6'>
                      {experiences.map(
                        (
                          {
                            id,
                            company_name,
                            title,
                            start_date,
                            end_date,
                            company_logo_url,
                          },
                          i
                        ) => {
                          const startDate = format(
                            new Date(start_date),
                            "MMM yyyy"
                          );
                          const endDate = end_date
                            ? format(new Date(end_date), "MMM yyyy")
                            : null;
                          return (
                            <div key={id} className='flex gap-3 items-center'>
                              <div className='w-[48px] h-[48px] bg-gray-200 rounded-full flex items-center justify-center'>
                                {company_logo_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={company_logo_url}
                                    alt={`${company_name} logo`}
                                    className='object-fit rounded-full'
                                  />
                                ) : (
                                  <MdBusiness
                                    className='text-secondary-black'
                                    size={28}
                                  />
                                )}
                              </div>
                              <div className='text-secondary-black text-sm'>
                                <h5 className='text-[#344054] font-medium'>
                                  {title}
                                </h5>
                                <p>{company_name}</p>
                                <div className=''>
                                  {startDate && endDate
                                    ? `${startDate} - ${endDate}`
                                    : startDate
                                    ? `${startDate} - Present`
                                    : ""}
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                    {loadingPortfolio && (
                      <div className='flex items-center justify-center mt-4'>
                        <div className='w-4 h-4 border-2 border-t-primary rounded-full animate-spin' />
                      </div>
                    )}
                    {!loadingPortfolio && !experiences.length && (
                      <p className='text-gray-500 text-sm mt-4'>
                        No work experience available
                      </p>
                    )}

                    <h5 className='text-sm text-gray-700 font-medium mt-6 mb-4'>
                      Certifications
                    </h5>
                    <div className='space-y-4'>
                      {certifications.map((cert, i) => (
                        <CertificationDisplay
                          certification={cert}
                          key={i}
                          hideDownload
                        />
                      ))}
                    </div>
                    {!certifications.length && (
                      <EmptyStateV3
                        imgSrc='/assets/icons/cert-empty-state.svg'
                        imgHeight={150}
                        imgWidth={150}
                        text='No Certifications'
                        subText='No certificates provided yet'
                        className='pt-0 pb-2'
                      />
                    )}
                  </>
                ) : (
                  <>
                    <h3 className='text-base font-medium text-primary-black'>
                      Application Overview
                    </h3>

                    {[
                      {
                        title: "Resume Fit & Cultural Fit Assessment",
                        description: aiFeedback.resume_feedback || "N/A",
                      },
                      {
                        title: "Skills Assessment",
                        description: `Achieved ${aiFeedback.assessment_score.toFixed(
                          1
                        )}%, showcasing core skills in ${
                          aiFeedback.assessment_title
                        } essential to the role.`,
                      },
                      {
                        title: "Pre-screening interview",
                        description: aiFeedback.prescreening_feedback || "N/A",
                      },
                    ].map((feedback, index) => (
                      <div
                        key={feedback.title}
                        className='mt-4 border rounded-lg p-3 border-[#EAECF0]'
                      >
                        <div className='flex items-center gap-2'>
                          <div
                            className={cn(
                              "rounded-full border-[#219150] text-[#219150] border bg-[#ECFDF3] w-[22px] h-[22px] flex items-center justify-center text-xs font-medium",
                              feedback.title === "Pre-screening interview" &&
                                "border-[#3580B5] text-[#3580B5] bg-[#ECFDF3]"
                            )}
                          >
                            {index + 1}
                          </div>
                          <h6 className='text-sm font-medium text-primary-black'>
                            {feedback.title}
                          </h6>
                        </div>

                        <div
                          dangerouslySetInnerHTML={{
                            __html: feedback.description || "N/A",
                          }}
                          className='mt-3 text-secondary-black text-xs [&_ul]:list-disc [&_ul]:list-inside'
                        />
                      </div>
                    ))}

                    {/*
                    <div className='my-5 border border-[#FEE5E5] rounded-lg bg-[#FFF0F0] p-3'>
                      <div className='flex items-center gap-1'>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          width='15'
                          height='14'
                          viewBox='0 0 15 14'
                          fill='none'
                        >
                          <path
                            d='M2.25 7C4.875 7 7.5 4.375 7.5 1.75C7.5 4.375 10.125 7 12.75 7C10.125 7 7.5 9.625 7.5 12.25C7.5 9.625 4.875 7 2.25 7Z'
                            stroke='#B53535'
                            strokeWidth='0.875'
                            strokeLinejoin='round'
                          />
                          <path
                            d='M1.6665 11.3753C2.15261 11.3753 3.12484 10.4031 3.12484 9.91699C3.12484 10.4031 4.09706 11.3753 4.58317 11.3753C4.09706 11.3753 3.12484 12.3476 3.12484 12.8337C3.12484 12.3476 2.15261 11.3753 1.6665 11.3753Z'
                            stroke='#B53535'
                            strokeWidth='0.875'
                            strokeLinejoin='round'
                          />
                          <path
                            d='M9.8335 2.91699C10.4168 2.91699 11.5835 1.75033 11.5835 1.16699C11.5835 1.75033 12.7502 2.91699 13.3335 2.91699C12.7502 2.91699 11.5835 4.08366 11.5835 4.66699C11.5835 4.08366 10.4168 2.91699 9.8335 2.91699Z'
                            stroke='#B53535'
                            strokeWidth='0.875'
                            strokeLinejoin='round'
                          />
                        </svg>
                        <h5 className='text-base font-medium text-[#B53535]'>
                          Proceed with Applicant:
                        </h5>
                      </div>
                      <p className='text-[#B53535] text-sm mt-2.5'>
                        {overallFeedback}
                      </p>
                    </div>
                    */}

                    <button
                      className='btn btn-primary btn-outline font-medium text-base w-full mt-5'
                      onClick={() => openModal("schedule-meeting")}
                    >
                      Schedule a call
                    </button>
                    <CreateContractModal
                      talentID={aiFeedback.talent_id}
                      name={aiFeedback.talent_name}
                      roles={roles}
                      buttonClassName='btn btn-primary font-medium text-base w-full mt-2'
                      defaultRole={
                        roles.find(
                          role =>
                            role.title.toLowerCase() ===
                            aiFeedback?.role.toLowerCase()
                        )?.id
                      }
                    />
                  </>
                )}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default ProfileModalWithAiFeedback;
