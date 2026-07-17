"use client";
import { useState } from "react";
import {
  Briefcase,
  MapPin,
  Building2,
  ArrowRight,
  DollarSign,
} from "lucide-react";

import { ID, Job } from "@/app/common/types";
import {
  formatPrice,
  htmlToPlainText,
  jobTypeEnumToLabel,
} from "@/app/common/utils";
import Link from "next/link";

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Posted today";
  if (diffDays === 1) return "Posted yesterday";
  if (diffDays < 7) return `Posted ${diffDays} days ago`;
  if (diffDays < 30) return `Posted ${Math.floor(diffDays / 7)} weeks ago`;
  return `Posted ${Math.floor(diffDays / 30)} months ago`;
};

const PublicCompanyProfileJobList = ({ jobs }: { jobs: Job[] }) => {
  const [selectedJob, setSelectedJob] = useState<ID | null>(null);
  return (
    <div className='relative overflow-hidden max-w-7xl mx-auto px-4 sm:px-6 -mt-8 sm:-mt-12 pb-12 sm:pb-20'>
      <div className='mb-8 sm:mb-12'>
        <h3 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3'>
          Available Positions
        </h3>
        <p className='text-base sm:text-lg text-gray-600'>
          Handpicked roles from leading companies in the industry
        </p>
      </div>

      <div className='grid gap-4 sm:gap-6 lg:grid-cols-2'>
        {jobs.map((job, index) => {
          const payment_range =
            job.payment_currency === "NGN"
              ? job.payment_range_ngn
              : job.payment_range_usd;
          const [min_salary, max_salary] = (payment_range ?? "")
            .split("-")
            .map(s => s.trim())
            .map(s => parseInt(s));
          return (
            <div
              key={job.id}
              className='group bg-white rounded-xl sm:rounded-2xl border border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden'
              style={{
                animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
              }}
            >
              <div className='p-5 sm:p-8'>
                <div className='flex items-start justify-between mb-4 gap-3'>
                  <div className='flex-1 min-w-0'>
                    <h4 className='text-lg sm:text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors'>
                      {job.title}
                    </h4>
                    <div className='flex items-center gap-2 mb-2'>
                      <Building2
                        size={14}
                        className='text-blue-600 flex-shrink-0 sm:w-4 sm:h-4'
                      />
                      <span className='text-sm sm:text-base font-semibold text-blue-600 truncate'>
                        {job.company.company_name}
                      </span>
                    </div>
                    <p className='text-xs sm:text-sm text-gray-500'>
                      {formatDate(job.date_created)}
                    </p>
                  </div>
                  <div className='w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 group-hover:from-blue-100 group-hover:to-blue-200 transition-all'>
                    <Briefcase
                      size={20}
                      className='text-blue-600 sm:w-6 sm:h-6'
                    />
                  </div>
                </div>

                <div className='flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6'>
                  <span className='inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-blue-50 text-blue-700 text-xs sm:text-sm font-medium rounded-lg'>
                    <Briefcase size={12} className='sm:w-3.5 sm:h-3.5' />
                    {jobTypeEnumToLabel(job.job_type)}
                  </span>
                  <span className='inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gray-100 text-gray-700 text-xs sm:text-sm font-medium rounded-lg'>
                    <MapPin size={12} className='sm:w-3.5 sm:h-3.5' />
                    {job.location}
                  </span>
                  <span className='inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-green-50 text-green-700 text-xs sm:text-sm font-medium rounded-lg'>
                    {/* <DollarSign size={12} className='sm:w-3.5 sm:h-3.5' /> */}
                    {min_salary
                      ? `${formatPrice({
                          price: min_salary,
                          currencyCode: job.payment_currency,
                          makeFriendly: true,
                          noOfDigits: 0,
                        })} - ${
                          isNaN(max_salary)
                            ? "above"
                            : formatPrice({
                                price: max_salary,
                                currencyCode: job.payment_currency,
                                makeFriendly: true,
                                noOfDigits: 0,
                              }).slice(1)
                        }`
                      : "N/A"}
                  </span>
                </div>

                <p className='text-sm sm:text-base text-gray-600 leading-relaxed mb-4 sm:mb-6 line-clamp-3'>
                  {htmlToPlainText(job.description)}
                </p>

                <button
                  onClick={() =>
                    setSelectedJob(selectedJob === job.id ? null : job.id)
                  }
                  className='w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 group'
                >
                  <span>View Details & Apply</span>
                  <ArrowRight
                    size={16}
                    className='group-hover:translate-x-1 transition-transform sm:w-[18px] sm:h-[18px]'
                  />
                </button>
              </div>

              {selectedJob === job.id && (
                <div className='border-t border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 sm:p-8 animate-fadeIn'>
                  <div className='mb-5 sm:mb-6'>
                    <h5 className='text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3 uppercase tracking-wide'>
                      About This Role
                    </h5>
                    <p
                      className='text-sm sm:text-base text-gray-700 leading-relaxed'
                      dangerouslySetInnerHTML={{ __html: job.description }}
                    />
                  </div>

                  <div className='mb-6 sm:mb-8'>
                    <h5 className='text-xs sm:text-sm font-bold text-gray-900 mb-3 sm:mb-4 uppercase tracking-wide'>
                      Requirements
                    </h5>
                    <p
                      className='text-sm sm:text-base text-gray-700 leading-relaxed'
                      dangerouslySetInnerHTML={{ __html: job.job_requirement }}
                    />
                  </div>

                  <Link
                    href={job.get_apply_url || "#"}
                    className='w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-base sm:text-lg font-bold rounded-lg sm:rounded-xl transition-all shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 hover:-translate-y-0.5'
                  >
                    <span>Apply Now</span>
                    <ArrowRight size={18} className='sm:w-5 sm:h-5' />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {jobs.length === 0 && (
        <div className='bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-10 sm:p-16 text-center shadow-xl'>
          <div className='w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6'>
            <Briefcase size={32} className='text-gray-400 sm:w-10 sm:h-10' />
          </div>
          <h3 className='text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3'>
            No Open Positions
          </h3>
          <p className='text-base sm:text-lg text-gray-600 max-w-md mx-auto'>
            We don&apos;t have any openings at the moment, but we&apos;re always
            looking for talented people. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
};

export default PublicCompanyProfileJobList;
