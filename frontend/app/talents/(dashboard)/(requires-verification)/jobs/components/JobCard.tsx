import Image from "next/image";
import { BsDot } from "react-icons/bs";
import { CiCalendar } from "react-icons/ci";
import { PiMapPinLine } from "react-icons/pi";
import { formatDistanceToNow } from "date-fns";
import { HiOutlineClock } from "react-icons/hi";
import { IoBusinessOutline } from "react-icons/io5";

import {
  cn,
  formatPrice,
  isRecentJob,
  jobTypeEnumToLabel,
} from "@/app/common/utils";
import { Job } from "@/app/common/types";
import JobOptionsModal from "./JobOptionsModal";

type JobCardProps = Job & {
  className?: string;
  selected?: boolean;
  setSelectedJob: (job: Job) => void;
};

const JobCard = ({ selected, setSelectedJob, ...job }: JobCardProps) => {
  const {
    id,
    title,
    company,
    className,
    description,
    date_created,
    job_type,
    location,
    payment_currency: currency,
    payment_range_ngn,
    payment_range_usd,
  } = job;
  const isRecent = isRecentJob(date_created);
  const payment_range =
    currency === "NGN" ? payment_range_ngn : payment_range_usd;
  const [min_salary, max_salary] = (payment_range ?? "")
    .split("-")
    .map(s => s.trim())
    .map(s => parseInt(s));
  return (
    <div
      role='button'
      className={cn(
        "card card-bordered hover:border-primary font-dm-sans",
        selected && "border-primary max-md:hidden",
        className
      )}
      onClick={() => setSelectedJob(job)}
    >
      <div className='card-body p-6'>
        <div className='flex justify-between'>
          <div className='flex max-sm:flex-col gap-6'>
            <div className='shrink-0'>
              {company.logo ? (
                <Image
                  src={company.logo}
                  alt={company.company_name}
                  width={72}
                  height={72}
                />
              ) : (
                <div className='w-[72px] h-[72px] bg-[#7D5AE21A] rounded-xl flex items-center justify-center'>
                  <IoBusinessOutline className='text-5xl text-[#7D5AE2]' />
                </div>
              )}
            </div>
            <div>
              <h4 className='text-lg text-[#141414]'>{company.company_name}</h4>
              <div className='flex items-center gap-3'>
                <h2 className='card-title md:text-2xl text-[#141414] font-medium my-1'>
                  {title}
                </h2>
                {isRecent && (
                  <div className='text-xs font-medium bg-[#7D5AE21A] text-[#7D5AE2] py-[2px] px-[6px] rounded-[3px] max-sm:hidden'>
                    Recently added
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className='md:hidden'>
            <JobOptionsModal />
          </div>
        </div>
        <div className='md:pl-24'>
          <div className='flex items-center text-base text-[#141414B2] max-sm:justify-between flex-wrap gap-4'>
            <div className='flex items-center gap-[6px]'>
              <PiMapPinLine aria-hidden />
              <span>{location}</span>
            </div>
            <BsDot aria-hidden />
            <div className='flex items-center gap-[6px]'>
              <HiOutlineClock aria-hidden />
              <span>{jobTypeEnumToLabel(job_type)}</span>
            </div>
            <BsDot aria-hidden />
            <span>
              {min_salary
                ? `${formatPrice({
                    price: min_salary,
                    currencyCode: currency,
                  })} - ${
                    isNaN(max_salary)
                      ? "above"
                      : formatPrice({
                          price: max_salary,
                          currencyCode: currency,
                        }).slice(1)
                  }`
                : "N/A"}
            </span>
            <BsDot aria-hidden className='max-sm:hidden' />
            <div className='flex items-center gap-[6px] max-sm:hidden'>
              <CiCalendar aria-hidden />
              <span>
                {formatDistanceToNow(new Date(date_created), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>

          <div
            className='mt-3 text-base text-[#141414B2] line-clamp-4'
            dangerouslySetInnerHTML={{
              __html: description,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default JobCard;
