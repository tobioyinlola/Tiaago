"use client";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { IoBusinessOutline } from "react-icons/io5";

import { Job } from "@/app/common/types";
import JobOptionsModal from "./JobOptionsModal";
import { cn, formatPrice, jobTypeEnumToLabel } from "@/app/common/utils";

type JobDetailsCardProps = Job & {
  className?: string;
  setSelectedJob: (job?: Job) => void;
};

const JobDetailsCard = ({
  id,
  title,
  company,
  className,
  description,
  location,
  job_type,
  experience,
  date_created,
  payment_currency: currency,
  no_of_applications,
  setSelectedJob,
  payment_range_ngn,
  payment_range_usd,
}: JobDetailsCardProps) => {
  const payment_range =
    currency === "NGN" ? payment_range_ngn : payment_range_usd;
  const [min_salary, max_salary] = (payment_range ?? "")
    .split("-")
    .map(s => s.trim())
    .map(s => parseInt(s));
  return (
    <div className={cn("card card-bordered font-dm-sans h-fit", className)}>
      <div className='card-body'>
        <div className='shrink-0 mb-4 flex justify-between'>
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
          <JobOptionsModal />
        </div>
        <h2 className='card-title text-2xl text-[#141414] font-medium'>
          {title}
        </h2>
        <h4 className='text-lg text-[#141414] my-1'>{company.company_name}</h4>

        <div className='text-xs font-medium bg-[#5374E71A] text-[#5374E7] py-2 px-[14px] rounded-full w-fit'>
          {no_of_applications || 0} Applicants
        </div>

        <div className='divider my-6' />

        <div className='grid grid-cols-2 text-base gap-y-6 gap-x-8'>
          <div>
            <h4 className='text-[#181823] font-bold'>Job Type</h4>
            <p className='text-[#6E6E9B]'>{jobTypeEnumToLabel(job_type)}</p>
          </div>
          <div>
            <h4 className='text-[#181823] font-bold'>Experience</h4>
            <p className='text-[#6E6E9B]'>{experience} years</p>
          </div>
          <div>
            <h4 className='text-[#181823] font-bold'>Location</h4>
            <p className='text-[#6E6E9B]'>{location}</p>
          </div>
          <div>
            <h4 className='text-[#181823] font-bold'>Date Posted</h4>
            <p className='text-[#6E6E9B]'>
              {format(new Date(date_created), "dd MMM, yyyy")}
            </p>
          </div>
        </div>

        <div className='divider my-6' />

        <h3 className='text-[#181823] font-bold text-xl'>Job Description</h3>
        <div
          className='mt-[10px] text-base text-[#6E6E9B]'
          dangerouslySetInnerHTML={{
            __html: description,
          }}
        />

        <div className='divider my-6' />
        <h3 className='text-[#181823] font-bold text-xl'>Base Salary</h3>
        <p className='mt-[10px] text-base text-[#6E6E9B]'>
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
        </p>

        <Link href={`/jobs/${id}/apply`} className='btn btn-primary text-white mt-4 rounded-xl'>
          Apply
        </Link>
        <button
          className='btn btn-outline mt-4 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-700'
          onClick={() => setSelectedJob()}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default JobDetailsCard;
