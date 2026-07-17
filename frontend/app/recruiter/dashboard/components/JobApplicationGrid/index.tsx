"use client";
import { toast } from "sonner";
import { PiDotsThreeBold } from "react-icons/pi";
import { PropsWithChildren, useRef, useState } from "react";

import EmptyState, {
  EmptyStateV3,
} from "@/app/common/components/dashboard/EmptyState";

import {
  AiFeedbackItem,
  JobApplication,
  TalentRole,
  User,
} from "@/app/common/types";
import AIFeedbackModal from "./AIFeedbackModal";
import { IntegrityScoreBadge, ProctoringViolationFlag } from "@/app/common/components/dashboard/ProctoringBadges";
import JsFileDownloader from "js-file-downloader";
import SearchBar from "@/app/common/components/SearchBar";
import TalentApplicationCard from "./TalentApplicationCard";
import ScrollArea from "@/app/common/components/ScrollArea";
import ProfileModal from "@/app/common/components/ProfileModal";
import { cn, handlePlural, openModal } from "@/app/common/utils";
import { jobApplicationMenuItems } from "./jobApplicationMenuItems";
import CoverLetterModal from "@/app/common/components/CoverLetterModal";
import { AvatarWithVerifiedBadge } from "@/app/common/components/UserAvatar";
import ScheduleMeetingModal from "@/app/common/components/ProfileModal/ScheduleMeetingModal";

const className =
  "select select-sm select-bordered text-[#2E2E2E] font-medium join-item focus:outline-none";

const JobApplicationGrid = ({
  applications,
  currentUserType,
  canScheduleMeeting,
}: {
  applications: JobApplication[];
  currentUserType: User["user_type"];
  canScheduleMeeting: boolean;
}) => {
  const profileModalRef = useRef<HTMLDialogElement>(null);
  const [activeApplicant, setActiveApplicant] = useState<
    JobApplication["applicant"]
  >(applications[0]?.applicant);
  return (
    <>
      <div className='w-full pl-6 pr-2 py-[14px] bg-[#D9DDFF] mb-8 flex max-sm:flex-col sm:items-center gap-1 justify-between'>
        <SearchBar />
        <div className='border-l flex items-center join'>
          <select className={className} defaultValue=''>
            <option disabled value=''>
              Filter
            </option>
          </select>
          <select className={className} defaultValue=''>
            <option disabled value=''>
              From
            </option>
          </select>
          <select className={className} defaultValue=''>
            <option disabled value=''>
              To
            </option>
          </select>
        </div>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 md:p-9 border rounded'>
        {applications.map(application => (
          <TalentApplicationCard
            key={application.id}
            application={application}
            onViewProfile={applicant => {
              setActiveApplicant(applicant);
              profileModalRef.current?.showModal();
            }}
          />
        ))}
        {!applications.length && (
          <div className='flex items-center justify-center col-span-3'>
            {/* <h4 className='text-[#667085] text-lg'>No applications yet</h4> */}
            <EmptyState text='No applications yet' />
          </div>
        )}
      </div>
      {!!activeApplicant && (
        <ProfileModal
          modalRef={profileModalRef}
          currentUserType={currentUserType}
          user={
            {
              ...activeApplicant,
              user_type: "T",
              first_name: activeApplicant.name.split(" ")[0],
              last_name: activeApplicant.name.split(" ")[1],
            } as any
          }
          disableScheduleMeeting={!canScheduleMeeting}
        />
      )}
    </>
  );
};

export default JobApplicationGrid;

type JobApplicationsTableProps = PropsWithChildren<{
  data: AiFeedbackItem[];
  className?: string;
  // roles: TalentRole[];
}>;

export const JobApplicationsTable = ({
  data,
  className,
  // roles,
}: JobApplicationsTableProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeApplicant, setActiveApplicant] = useState<AiFeedbackItem>(
    data[0]
  );
  // const profileModalRef = useRef<HTMLDialogElement>(null);
  const coverLetterModalRef = useRef<HTMLDialogElement>(null);
  const handleClick = (
    action: (typeof jobApplicationMenuItems)[number]["label"],
    item: AiFeedbackItem
  ) => {
    setActiveApplicant(item);
    switch (action) {
      case "View detailed report":
        setIsModalOpen(true);
        break;
      // case "View profile":
      //   profileModalRef.current?.showModal();
      //   break;
      case "Download Resume":
        new JsFileDownloader({
          url: item.resume,
        })
          .then(() => toast.success("download successful"))
          .catch(error => {
            window.open(item.resume, "_blank");
          });
        break;
      case "View Cover Letter":
        coverLetterModalRef.current?.showModal();
        break;
      case "Schedule Interview":
        openModal("schedule-meeting");
        break;
      default:
        toast.info("Coming soon...");
        break;
    }
  };
  return (
    <>
      <ScrollArea
        className={cn(
          "dashboard-content-constraint pb-1 bg-transparent",
          className
        )}
      >
        <div className='h-24' />
        <div className='w-full rounded-t-xl pl-6 pr-2 h-20 border border-[#F5F5F5] bg-[#EBECEE] flex items-center justify-between'>
          <h2 className='text-base md:text-lg font-semibold text-[#343A40]'>
            {data.length} Job {handlePlural(data.length, "Applicant")}
          </h2>
        </div>
        <table className='table table-zebra border border-t-0 rounded-b-lg'>
          {/* head */}
          <thead>
            <tr>
              <th>Talents</th>
              <th>Role</th>
              <th>Resume Analysis Score</th>
              <th>Assessment Score</th>
              {/* <th>Pre-screening Score</th> */}
              <th>Overall Score</th>
              <th>Proctoring</th>
              <th />
              {/* <th>Stage</th> */}
            </tr>
          </thead>
          <tbody>
            {data.length ? (
              data.map((feedback, i) => (
                <tr key={feedback.application_id}>
                  <td className='flex items-center gap-2'>
                    <AvatarWithVerifiedBadge
                      profilePic={feedback.profile_picture}
                      firstName={feedback.talent_name?.split(" ")[0] || ""}
                      lastName={feedback.talent_name?.split(" ")[1] || ""}
                      className='w-10'
                      verified={feedback.has_passed_tiaago_assessment}
                    />
                    <div className='font-medium'>
                      <h6 className='text-[#101828] capitalize'>
                        {feedback.talent_name}
                      </h6>
                      <p className='text-[#667085]'>{feedback.email}</p>
                    </div>
                  </td>
                  <td className='max-sm:hidden text-[#2E2E2E] capitalize'>
                    {feedback.role}
                  </td>
                  <td>
                    <div className='relative h-4 w-56'>
                      <progress
                        className='progress [&::-moz-progress-bar]:bg-[#4AB4FF] [&::-webkit-progress-value]:bg-[#4AB4FF] h-4 bg-transparent z-[2] rounded-[4px] [&::-webkit-progress-value]:rounded-[4px] [&::-moz-progress-bar]:rounded-[4px]'
                        value={(feedback.resume_analysis_score / 100) * 100}
                        max={100}
                      />
                      <progress
                        className='progress bg-[#4AB4FF1A] rounded-[4px] h-4 absolute left-0 top-0 z-[1]'
                        value={0}
                        max={100}
                      />
                      <p
                        className={cn(
                          "absolute top-0 left-0 text-white text-xs text-center font-medium z-[3] pr-1.5",
                          feedback.resume_analysis_score <= 10 &&
                            "text-[#FF0000]"
                        )}
                        style={{
                          width: `${
                            (feedback.resume_analysis_score / 100) * 100
                          }%`,
                        }}
                      >
                        {feedback.resume_analysis_score}/{100}
                      </p>
                    </div>
                  </td>
                  <td>
                    <div className='relative h-4 w-56'>
                      <progress
                        className='progress [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-value]:bg-primary h-4 bg-transparent z-[2] rounded-[4px] [&::-webkit-progress-value]:rounded-[4px] [&::-moz-progress-bar]:rounded-[4px]'
                        value={(feedback.assessment_score / 100) * 100}
                        max={100}
                      />
                      <progress
                        className='progress bg-[#5374E71A] rounded-[4px] h-4 absolute left-0 top-0 z-[1]'
                        value={0}
                        max={100}
                      />
                      <p
                        className={cn(
                          "absolute top-0 left-0 text-white text-xs font-medium z-[3] text-center pr-1.5",
                          feedback.assessment_score <= 10 && "text-[#FF0000]"
                        )}
                        style={{
                          width: `${(feedback.assessment_score / 100) * 100}%`,
                        }}
                      >
                        {feedback.assessment_score}/{100}
                      </p>
                    </div>
                  </td>
                  {/* <td>
                    <div className='relative h-4 w-56'>
                      <progress
                        className='progress [&::-moz-progress-bar]:bg-[#4AB4FF] [&::-webkit-progress-value]:bg-[#4AB4FF] h-4 bg-transparent z-[2] rounded-[4px] [&::-webkit-progress-value]:rounded-[4px] [&::-moz-progress-bar]:rounded-[4px]'
                        value={(feedback.cultural_fitness_score / 100) * 100}
                        max={100}
                      />
                      <progress
                        className='progress bg-[#4AB4FF1A] rounded-[4px] h-4 absolute left-0 top-0 z-[1]'
                        value={0}
                        max={100}
                      />
                      <p
                        className={cn(
                          "absolute top-0 left-0 text-white text-xs font-medium z-[3] text-center pr-1.5",
                          feedback.cultural_fitness_score <= 10 &&
                            "text-[#FF0000]"
                        )}
                        style={{
                          width: `${
                            (feedback.cultural_fitness_score / 100) * 100
                          }%`,
                        }}
                      >
                        {feedback.cultural_fitness_score}/{100}
                      </p>
                    </div>
                  </td> */}
                  <td>
                    <div
                      className={cn(
                        "rounded-2xl bg-[#ECFDF3] px-2 py-0.5 text-center w-fit mx-auto",
                        feedback.overall_score < 70 && "bg-[#FFEDED]"
                      )}
                    >
                      <p
                        className={cn(
                          "text-[#027A48] text-xs font-medium",
                          feedback.overall_score < 70 && "!text-[#B53535]"
                        )}
                      >
                        {parseInt(feedback.overall_score.toString())}%
                      </p>
                    </div>
                  </td>
                  <td>
                    <div className='flex items-center justify-center gap-1.5'>
                      <IntegrityScoreBadge
                        score={feedback.proctoring_integrity_score}
                        riskLevel={feedback.proctoring_risk_level}
                      />
                      <ProctoringViolationFlag show={feedback.proctoring_has_violation} />
                    </div>
                  </td>
                  {/* <td>
                    <div className='flex items-center'>
                      {Array.from({ length: 3 }).map((_, index, arr) => (
                        <>
                          <div
                            key={index}
                            className={cn(
                              "rounded-full border-[#219150] text-[#219150] border bg-[#ECFDF3] w-[22px] h-[22px] flex items-center justify-center text-xs font-medium",
                              index === arr.length - 1 &&
                                "border-[#3580B5] text-[#3580B5]"
                            )}
                          >
                            {index + 1}
                          </div>
                          <div
                            className={cn(
                              "h-[1px] w-6 bg-[#219150]",
                              index === arr.length - 1 && "hidden"
                            )}
                          />
                        </>
                      ))}
                    </div>
                  </td> */}
                  <td>
                    <div className='dropdown dropdown-hover dropdown-end dropdown-top'>
                      <div
                        tabIndex={0}
                        className='w-6 h-6 cursor-pointer'
                        aria-label='open menu'
                        role='button'
                      >
                        <PiDotsThreeBold className='text-2xl' />
                      </div>
                      <ul
                        tabIndex={0}
                        className='dropdown-content z-[2] menu shadow bg-base-100 rounded-lg w-max px-[2px] py-[18px]'
                      >
                        {jobApplicationMenuItems.map(({ label, Icon }) => {
                          return (
                            <li key={label}>
                              <a
                                className='flex items-center gap-6 text-[13px] font-medium text-[#7F7F7F] hover:text-[#292D32] fill-[#7F7F7F] hover:fill-[#292D32] hover:bg-[#D9DDFF66] px-4 py-2 min-w-[190px]'
                                onClick={() => handleClick(label, feedback)}
                              >
                                <Icon className='text-2xl' />
                                {label}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <EmptyStateV3 text='No applications yet' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
      {!!activeApplicant && (
        <>
          {/* <ProfileModalWithAiFeedback
            modalRef={profileModalRef}
            aiFeedback={activeApplicant}
            roles={roles}
          /> */}
          <ScheduleMeetingModal
            talentID={activeApplicant.talent_id}
            name={activeApplicant.talent_name}
            buttonClassName='hidden'
          />
          <CoverLetterModal
            modalRef={coverLetterModalRef}
            coverLetter={activeApplicant.cover_letter}
          />
          <AIFeedbackModal
            aiFeedback={activeApplicant}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        </>
      )}
    </>
  );
};
