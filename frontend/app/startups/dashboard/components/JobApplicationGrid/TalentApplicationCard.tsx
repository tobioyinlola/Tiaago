"use client";
import { toast } from "sonner";
import { format } from "date-fns";
import { FiEye } from "react-icons/fi";
import JsFileDownloader from "js-file-downloader";

import { JobApplication } from "@/app/common/types";
import { AvatarWithVerifiedBadge } from "@/app/common/components/UserAvatar";
import { ButtonModal } from "@/app/common/components/Modal";

const TalentApplicationCard = ({
  application,
  onViewProfile,
}: {
  application: JobApplication;
  onViewProfile: (applicant: JobApplication["applicant"]) => void;
}) => {
  const downloadResume = () => {
    new JsFileDownloader({
      url: application.applicant.resume,
    })
      .then(() => toast.success("download successful"))
      .catch(error => {
        window.open(application.applicant.resume, "_blank");
      });
  };
  return (
    <div className='border rounded px-5 py-9'>
      <div className='flex items-center gap-2 border-b pb-3 mb-3'>
        <AvatarWithVerifiedBadge
          profilePic={application.applicant.profile_pic}
          firstName={application.applicant.name.split(" ")[0] ?? ""}
          lastName={application.applicant.name.split(" ")[1] ?? ""}
          verified={application.applicant.has_passed_assessment}
        />
        <div className='h-full flex flex-col justify-between'>
          <h6 className='text-sm text-[#101828] font-medium'>
            {application.applicant.name}
          </h6>
          <p className='text-[#667085] text-xs capitalize'>
            {application.applicant.role}
          </p>
        </div>
      </div>
      <ul className='list-disc list-inside text-[#667085] text-xs'>
        <li className='capitalize'>{application.applicant.experience_level}</li>
        <li>
          Applied: {format(new Date(application.applied_date), "MMM dd, yyyy")}
        </li>
      </ul>
      <div className='flex flex-col'>
        <ButtonModal
          id={"view-talent-application-" + application.id}
          buttonText='View Application'
          buttonClassName='btn btn-outline mt-4 group border-[#D0D5DD] text-[#344054] hover:bg-[#344054] btn-sm h-9'
          autoHeight
          scrollAreaClassName='flex flex-col justify-between'
        >
          <div className='w-[80svw] max-w-md flex flex-col min-h-full'>
            <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
              View Talent Application
            </h3>
            <p className='text-[#999] text-sm -tracking-[0.1px]'>
              Kindly read through the talent&apos;s application.
            </p>
            <article className='mt-2 border-t py-8'>
              <h4 className='text-[#101828] font-semibold text-lg mb-2'>
                Cover Letter
              </h4>
              <div
                className='prose'
                dangerouslySetInnerHTML={{ __html: application.cover_letter }}
              />
            </article>
          </div>
          <button
            disabled={!application.applicant.resume}
            onClick={downloadResume}
            className='btn btn-primary w-full mt-auto'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='20'
              height='20'
              viewBox='0 0 24 24'
              className='fill-white'
            >
              <path d='M15 22.75H9C3.57 22.75 1.25 20.43 1.25 15V9C1.25 3.57 3.57 1.25 9 1.25H15C20.43 1.25 22.75 3.57 22.75 9V15C22.75 20.43 20.43 22.75 15 22.75ZM9 2.75C4.39 2.75 2.75 4.39 2.75 9V15C2.75 19.61 4.39 21.25 9 21.25H15C19.61 21.25 21.25 19.61 21.25 15V9C21.25 4.39 19.61 2.75 15 2.75H9Z' />
              <path d='M11.9995 15.26C11.8095 15.26 11.6195 15.1899 11.4695 15.0399L8.46945 12.0399C8.17945 11.7499 8.17945 11.27 8.46945 10.98C8.75945 10.69 9.23945 10.69 9.52945 10.98L11.9995 13.45L14.4695 10.98C14.7595 10.69 15.2395 10.69 15.5295 10.98C15.8195 11.27 15.8195 11.7499 15.5295 12.0399L12.5295 15.0399C12.3795 15.1899 12.1895 15.26 11.9995 15.26Z' />
              <path d='M12 15.26C11.59 15.26 11.25 14.92 11.25 14.51V6.51001C11.25 6.10001 11.59 5.76001 12 5.76001C12.41 5.76001 12.75 6.10001 12.75 6.51001V14.51C12.75 14.93 12.41 15.26 12 15.26Z' />
              <path d='M12.0004 18.23C9.89043 18.23 7.77043 17.89 5.76043 17.22C5.37043 17.09 5.16043 16.66 5.29043 16.27C5.42043 15.88 5.84043 15.66 6.24043 15.8C9.96043 17.04 14.0504 17.04 17.7704 15.8C18.1604 15.67 18.5904 15.88 18.7204 16.27C18.8504 16.66 18.6404 17.09 18.2504 17.22C16.2304 17.9 14.1104 18.23 12.0004 18.23Z' />
            </svg>
            {application.applicant.resume ? "Download" : "No"} Resume
          </button>
        </ButtonModal>
        <button
          onClick={() => onViewProfile(application.applicant)}
          className='btn btn-primary mt-4 btn-sm h-9'
        >
          <FiEye className='text-xl' />
          View Profile
        </button>
      </div>
    </div>
  );
};

export default TalentApplicationCard;
