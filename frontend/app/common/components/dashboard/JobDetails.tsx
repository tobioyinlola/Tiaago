import { PiMapPinLine } from "react-icons/pi";
import { HiOutlineBriefcase } from "react-icons/hi2";

import MoneyBagIcon from "../../icons/MoneyBagIcon";
import { jobSalaryTypeToLabel, jobTypeEnumToLabel } from "../../utils";
import { WORK_TYPE_OPTIONS } from "../../constants/talent-network";
import { InitialValues as JobV3 } from "@/app/recruiter/dashboard/jobs/create/CreateJobForm/form.constants";

/** `location` is no longer a recruiter-editable form field -- the backend
 * derives it from work mode + country -- so it only exists on an already saved
 * job (the public job detail page). While previewing an unsaved edit we fall
 * back to the two fields it's derived from. */
const JobDetails = ({ job }: { job: JobV3 & { location?: string } }) => {
  const workModeLabel = WORK_TYPE_OPTIONS.find(
    ({ value }) => value === job.work_mode
  )?.label;
  const location =
    job.location ||
    [workModeLabel, job.country].filter(Boolean).join(", ") ||
    "Unavailable";

  // const [minSalary, maxSalary] = (job.payment_range ?? "")
  //   .split("-")
  //   .map(s => s.trim())
  //   .map(s => parseInt(s));
  const paymentRange = isNaN(+(job.payment_range?.at(1) ?? ""))
    ? job.payment_range.slice(1)
    : job.payment_range;

  return (
    <>
      <h2 className='text-2xl font-bold text-primary-black mb-5'>
        {(job as any).title || job.role}
      </h2>
      <div className='flex flex-wrap gap-8 md:gap-16 text-sm text-primary-black'>
        <div>
          <div className='flex items-center gap-2'>
            <PiMapPinLine aria-hidden className='text-[#868A8D] text-xl' />
            <h4 className='text-[#343A40]'>Location</h4>
          </div>
          <p>{location}</p>
        </div>
        <div>
          <div className='flex items-center gap-2'>
            <HiOutlineBriefcase
              aria-hidden
              className='text-[#868A8D] text-xl'
            />
            <h4 className='text-[#343A40]'>Job Type</h4>
          </div>
          <p>{jobTypeEnumToLabel(job.job_type)}</p>
        </div>
        <div>
          <div className='flex items-center gap-2'>
            <MoneyBagIcon aria-hidden className='text-[#868A8D] text-xl' />
            <h4 className='text-[#343A40]'>Payment Type</h4>
          </div>
          <p>{jobSalaryTypeToLabel(job.salary_duration as any)}</p>
        </div>
        <div>
          <div className='flex items-center gap-2'>
            <MoneyBagIcon aria-hidden className='text-[#868A8D] text-xl' />
            <h4 className='text-[#343A40]'>Payment Range</h4>
          </div>
          <p>
            {/* {job.payment_range
              ? `${formatPrice({
                  price: minSalary,
                  currencyCode: job.payment_currency,
                  noOfDigits: 0,
                })} - ${
                  isNaN(maxSalary)
                    ? "above"
                    : formatPrice({
                        price: maxSalary,
                        currencyCode: job.payment_currency,
                        noOfDigits: 0,
                      })
                }`
              : "Unavailable"} */}
            {paymentRange ? paymentRange : "Unavailable"}
          </p>
        </div>
      </div>
      <h3 className='text-[#343A40] font-medium text-xl mt-8 mb-2'>About Us</h3>
      <div
        className='text-sm md:text-base text-[#6C757D]'
        dangerouslySetInnerHTML={{
          __html: job.about_company,
        }}
      />
      <h3 className='text-[#343A40] font-medium text-xl mt-8 mb-2'>
        Job Description
      </h3>
      <div
        className='text-sm md:text-base text-[#6C757D]'
        dangerouslySetInnerHTML={{
          __html: job.description,
        }}
      />
      <h3 className='text-[#343A40] font-medium text-xl mt-8 mb-2'>
        Requirement
      </h3>
      <div
        className='text-sm md:text-base text-[#6C757D]'
        dangerouslySetInnerHTML={{
          __html: job.job_requirement,
        }}
      />
    </>
  );
};

export default JobDetails;
