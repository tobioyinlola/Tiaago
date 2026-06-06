"use client";

import { toast } from "sonner";
import Image from "next/image";
import JsFileDownloader from "js-file-downloader";
import { MdOutlineFileDownload } from "react-icons/md";

import { cn, getAssessmentDifficultyLevel } from "@/app/common/utils";
import { AssessmentCert2, AssessmentCert3 } from "@/app/common/types";

const Certifications = ({
  certifications,
}: {
  certifications: (AssessmentCert2 | AssessmentCert3)[];
}) => {
  return (
    <section className='w-full max-md:max-w-md max-md:mx-auto dashboard-content-constraint'>
      <h2 className='text-base font-bold text-primary-black'>Certifications</h2>
      <p className='text-sm text-secondary-black mb-6 md:border-b border-outline pb-4'>
        Your tiaago certifications will appear here
      </p>

      <div className='flex items-center gap-3 flex-wrap'>
        {certifications.map((cert, i) => (
          <CertificationDisplay certification={cert} key={i} />
        ))}
        {!certifications.length && (
          <p className='text-sm text-secondary-black'>No certifications yet.</p>
        )}
      </div>
    </section>
  );
};

export default Certifications;

const goldBadge = "/assets/icons/badges/Gold badge.svg";
const silverBadge = "/assets/icons/badges/Silver badge.svg";

// React Junior Level (Junior)
// get difficulty level from skill_title
const getLevelFromSkillTitle = (skillTitle: string) => {
  const title = skillTitle.toLowerCase();
  if (title.includes("junior")) return "Junior";
  if (title.includes("mid") || title.includes("intermediate")) return "Mid";
  if (title.includes("senior") || title.includes("advanced")) return "Senior";
  return "Unknown";
};

export const CertificationDisplay = ({
  certification,
  className,
  hideDownload,
}: {
  certification: AssessmentCert2 | AssessmentCert3;
  className?: string;
  hideDownload?: boolean;
}) => {
  const isCert3 = (cert: any): cert is AssessmentCert3 => {
    return cert && "talent_name" in cert;
  };
  const skillTitle = isCert3(certification)
    ? certification?.skill_title
    : certification?.skill_assessment?.title ?? "";
  const difficultyLevel = getAssessmentDifficultyLevel(
    isCert3(certification)
      ? getLevelFromSkillTitle(skillTitle)
      : certification?.skill_assessment?.difficulty_level ?? ""
  );

  const downloadCert = () => {
    if (!certification.certificate_url) {
      toast.error("Certificate not available for download");
      return;
    }
    new JsFileDownloader({
      url: certification.certificate_url,
    })
      .then(() => toast.success("Download successful"))
      .catch(error => {
        window.open(certification.certificate_url, "_blank");
      });
  };

  return (
    <div
      className={cn(
        "bg-[#F1F3FF] p-3 w-full rounded-lg flex gap-3 items-center",
        className
      )}
    >
      <Image
        src={difficultyLevel === "Senior" ? goldBadge : silverBadge}
        alt='Certification badge'
        width={40}
        height={40}
        className='object-cover'
      />
      <div>
        <h3 className='text-sm font-medium text-primary-black'>{skillTitle}</h3>
        <p className='text-xs text-[#344054]'>{difficultyLevel}</p>
        <p className='text-[10px] text-[#6C757D] mt-2'>Issued by Tiaago</p>
      </div>

      {!hideDownload && (
        <MdOutlineFileDownload
          className='ml-auto text-xl text-[#9EA0A3] cursor-pointer'
          onClick={downloadCert}
        />
      )}
    </div>
  );
};
