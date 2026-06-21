import Link from "next/link";
import { Metadata } from "next";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";

import {
  cn,
  getAssessmentDifficultyLevel,
  handleServerApiCallError,
} from "@/app/common/utils";
import CalendarV2 from "@/app/common/components/Calendar/V2";
import { getSchedule } from "@/app/common/services/schedule";
import { getCurrentUser } from "@/app/common/services/profile";
import { getJobApplications } from "@/app/common/services/jobs";
import {
  getAssessmentCerts,
  getCompanyAssessments,
} from "@/app/common/services/assessment";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";
import { DashboardWelcome } from "@/app/common/components/dashboard/VerifyAccount";
import RecentlyAppliedTable from "@/app/talents/(dashboard)/components/RecentlyAppliedTable";
import { CertificationDisplay } from "../settings/components/Tabs/ProfileTab/Certifications";

export const metadata: Metadata = {
  title: "Dashboard",
};

const TalentDashboard = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const currentUser = (await getCurrentUser("talent")).currentUser;
  const applicationsRes = await getJobApplications(1, 5).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get job appications error (talent dashboard): ", error);
    errors.push({
      message: error,
      title: "Error getting job appications",
    });
    return {
      results: [],
    };
  });
  const applications = applicationsRes.results || [];
  const assessmentsRes = await getCompanyAssessments(1, 3).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get skill assessments error (talent dashboard): ", error);
    errors.push({
      message: error,
      title: "Error getting skill assessments",
    });
    return {
      results: [],
    };
  });
  const assessments = assessmentsRes.results || [];
  const schedule = await getSchedule().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get schedule error (talent dashboard): ", error);
    errors.push({
      message: error,
      title: "Error getting schedule",
    });
    return [];
  });
  const scheduledEvents = schedule.filter(meeting => meeting.accepted);
  const certificatesRes = await getAssessmentCerts(1, 3).catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get certificates error (talent dashboard): ", error);
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
  const certificates = certificatesRes.results;

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <h1 className='text-xl md:text-2xl font-switzer mb-2 md:mb-3'>
        Welcome,
        <span className='font-semibold'> {currentUser.first_name}!👋🏻</span>
      </h1>
      <DashboardWelcome as='talent' />

      <div className='mt-9 grid md:grid-cols-3 gap-[18px]'>
        <div className='md:col-span-2 flex flex-col'>
          <h3 className='text-[#343A40] text-lg font-medium font-switzer mb-4'>
            Job Applications
          </h3>
          <RecentlyAppliedTable data={applications} />
        </div>
        <div className=''>
          <h3 className='text-[#343A40] text-lg font-medium font-switzer mb-4'>
            Assessments
          </h3>
          <div className='bg-white px-5 py-6 rounded-xl border border-[#E1E3E5]'>
            <div className='space-y-3'>
              {assessments.map((assessment, index) => {
                return (
                  <div key={index} className='bg-[#F1F3FF] p-3 rounded-lg'>
                    <h2 className='text-sm text-[#344054] flex items-center gap-3'>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        width='20'
                        height='20'
                        viewBox='0 0 20 20'
                        fill='none'
                      >
                        <path
                          d='M18.3335 11.6665V8.33317C18.3335 5.19047 18.3335 3.61913 17.3572 2.64281C16.3809 1.6665 14.8095 1.6665 11.6668 1.6665H10.0002C6.85747 1.6665 5.28612 1.6665 4.30981 2.64281C3.3335 3.61913 3.3335 5.19047 3.3335 8.33317V11.6665C3.3335 14.8092 3.3335 16.3805 4.30981 17.3569C5.28612 18.3332 6.85747 18.3332 10.0002 18.3332H11.6668C14.8095 18.3332 16.3809 18.3332 17.3572 17.3569C18.3335 16.3805 18.3335 14.8092 18.3335 11.6665Z'
                          stroke='#141B34'
                          strokeWidth='1.5'
                        />
                        <path
                          d='M4.16675 5L1.66675 5M4.16675 10H1.66675M4.16675 15H1.66675'
                          stroke='#141B34'
                          strokeWidth='1.5'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                        <path
                          d='M14.5833 5.83301L11.25 5.83301M12.9167 9.16634H11.25'
                          stroke='#141B34'
                          strokeWidth='1.5'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                        <path
                          d='M7.5 18.333L7.5 1.66634'
                          stroke='#141B34'
                          strokeWidth='1.5'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                      <Link
                        className='hover:text-primary'
                        href={`/talents/assessments/${assessment.id}`}
                      >
                        {assessment.title}
                      </Link>
                    </h2>
                    <div className='flex gap-2 mt-2'>
                      {["Senior", "Intermediate", "Junior"].map(level => (
                        <div
                          key={level}
                          className={cn(
                            "text-xs py-0.5 px-2 min-w-[67px] rounded-[3px] bg-[#F8F9FA] text-[#6C757D] font-medium text-center",
                            getAssessmentDifficultyLevel(
                              assessment.difficulty_level
                            ) === level && "bg-[#7684FF] text-white"
                          )}
                        >
                          {level}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {!assessments.length && (
                <EmptyStateV3
                  imgHeight={150}
                  imgWidth={150}
                  text='No Assessments'
                  subText='Assessments created will appear here.'
                />
              )}
            </div>

            {!!assessments.length && (
              <div className='flex justify-end mt-5'>
                <Link
                  href='/talents/assessments'
                  className='btn btn-ghost bg-white border-gray-200'
                >
                  View All
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='mt-7 grid md:grid-cols-3 gap-[18px]'>
        <div className='md:col-span-2 flex flex-col'>
          <h3 className='text-[#343A40] text-lg font-medium font-switzer mb-4'>
            Events
          </h3>
          <div className='border border-[#E1E3E5] rounded-xl flex-1'>
            {!scheduledEvents.length ? (
              <EmptyStateV3
                imgSrc='/assets/icons/event-empty-state.svg'
                imgHeight={150}
                imgWidth={150}
                text='No Event'
                subText='When you schedule an event, it will appear here'
              />
            ) : (
              <CalendarV2
                scheduledEvents={scheduledEvents}
                className='mt-0 mb-0 rounded-xl'
                defaultView='month'
                isSingleView={true}
              />
            )}
          </div>
        </div>
        <div className='flex flex-col'>
          <h3 className='text-[#343A40] text-lg font-medium font-switzer mb-4'>
            Certificates
          </h3>
          <div className='border border-[#E1E3E5] rounded-xl flex-1'>
            <div className='space-y-8 m-2'>
              {certificates.map((cert, i) => (
                <CertificationDisplay certification={cert} key={i} />
              ))}
            </div>
            {!certificates.length && (
              <EmptyStateV3
                imgSrc='/assets/icons/cert-empty-state.svg'
                imgHeight={150}
                imgWidth={150}
                text='No Certificate'
                subText='When you get certificates, it will appear here'
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TalentDashboard;
