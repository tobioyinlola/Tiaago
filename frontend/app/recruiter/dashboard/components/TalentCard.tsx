"use client";
import Link from "next/link";
import { toast } from "sonner";
import { FiEye } from "react-icons/fi";
import JsFileDownloader from "js-file-downloader";

import { cn, htmlToPlainText } from "@/app/common/utils";
import { Talent } from "@/app/common/types";
import DownloadIcon from "@/app/common/icons/DownloadIcon";
import { AvatarWithVerifiedBadge } from "@/app/common/components/UserAvatar";
import { BASE_URL } from "@/app/common/constants";

const TalentCard = ({
  talent,
  onViewProfile,
}: {
  talent: Talent;
  onViewProfile: (talent: Talent) => void;
}) => {
  const downloadResume = () => {
    new JsFileDownloader({
      url: talent.resume,
    })
      .then(() => toast.success("download successful"))
      .catch(error => {
        window.open(talent.resume, "_blank");
      });
  };
  return (
    <div className='border rounded px-5 py-9 w-full'>
      <div className='flex items-center gap-2 border-b pb-3 mb-3'>
        <AvatarWithVerifiedBadge
          firstName={talent.first_name}
          lastName={talent.last_name}
          profilePic={talent.profile_pic}
          verified={talent.has_passed_assessment}
        />
        <div className='h-full flex flex-col justify-between'>
          <h6 className='text-sm text-[#101828] font-medium'>
            {talent.first_name + " " + talent.last_name}
          </h6>
          <p className='text-[#667085] text-xs capitalize'>{talent.role}</p>
        </div>
      </div>
      <ul className='list-disc list-inside text-[#667085] text-xs'>
        <li className='line-clamp-2'>
          <div className='list-item'>
            About:
            <span> {htmlToPlainText(talent.bio || "N/A")}</span>
          </div>
        </li>
        <li>Country: {talent.country || "N/A"}</li>
        <li>
          <Link
            href={`${BASE_URL}/talents/${talent.username}/portfolio`}
            target='_blank'
            className='text-primary'
          >
            Portfolio
          </Link>
        </li>
      </ul>
      <div className='flex flex-col'>
        <button
          onClick={downloadResume}
          className={cn(
            "btn btn-outline mt-4 group border-[#D0D5DD] text-[#344054] hover:bg-[#344054] btn-sm h-9",
            !talent.resume && "invisible"
          )}
        >
          <DownloadIcon className='group-hover:fill-white fill-[#344054]' />
          Download Resume
        </button>
        <button
          onClick={() => onViewProfile(talent)}
          className='btn btn-primary mt-4 btn-sm h-9'
        >
          <FiEye className='text-xl' />
          View Profile
        </button>
      </div>
    </div>
  );
};

export default TalentCard;

export const FindTalentCard = ({
  talent,
  showContractModal,
  onViewProfile,
}: {
  talent: Talent;
  showContractModal: (talent: Talent) => void;
  onViewProfile: (talent: Talent) => void;
}) => {
  const portfolioPreview = (talent as any)?.talent_portfolio_preview;
  const verifiedSkillsets: string[] =
    portfolioPreview?.verified_skillsets ?? [];
  return (
    <div className='card bg-base-100 card-bordered shadow-0 md:card-side'>
      <figure className='md:w-56 md:bg-fuchsia-100/75 rounded-l-2xl shrink-0'>
        <div className='rounded-l-2xl px-4 flex items-center py-2 h-full w-fit shrink-0'>
          <AvatarWithVerifiedBadge
            firstName={talent.first_name}
            lastName={talent.last_name}
            profilePic={talent.profile_pic}
            verified={talent.has_passed_assessment}
            size={28}
            className='w-32 text-4xl shrink-0'
          />
        </div>
      </figure>
      <div className='card-body'>
        <p className='text-sm rounded capitalize max-md:text-center'>
          {talent.role}
        </p>
        <h4 className='text-lg md:text-2xl text-[#101828] font-semibold max-md:text-center'>
          {talent.first_name + " " + talent.last_name}
        </h4>
        <div className='flex gap-2'>
          <h6 className='text-sm text-[#101828] font-medium'>About:</h6>
          <div
            className='text-[#667085] text-sm'
            dangerouslySetInnerHTML={{ __html: talent.bio }}
          />
        </div>
        <div className='flex gap-2 flex-wrap items-center'>
          <h6 className='text-sm text-[#101828] font-medium'>Location:</h6>
          <span className='text-[#667085] text-sm w-fit'>{talent.country}</span>
          {!!verifiedSkillsets.length && (
            <>
              <h6 className='text-sm text-[#101828] font-medium'>
                Verified Skillsets:
              </h6>
              {verifiedSkillsets.map((skill, index) => (
                <span
                  key={index}
                  className='badge rounded-full badge-outline badge-primary w-fit'
                >
                  {skill}
                </span>
              ))}
            </>
          )}
        </div>

        <div className='flex max-sm:flex-col items-center gap-2 max-md:justify-center mt-2'>
          <button
            className='btn btn-outline font-medium border-gray-300 shadow-sm text-gray-700 max-sm:w-full'
            onClick={() => showContractModal(talent)}
          >
            Create Contract
          </button>
          <button
            className='btn btn-primary font-medium max-sm:w-full'
            onClick={() => onViewProfile(talent)}
          >
            View Profile
          </button>
        </div>
      </div>
    </div>
  );
};
