import Link from "next/link";
import { format } from "date-fns";
import { IconBaseProps } from "react-icons";

import SortIcon from "@/app/common/icons/SortIcon";
import { JobApplication } from "@/app/common/types";
import ScrollArea from "@/app/common/components/ScrollArea";
import UserAvatar from "@/app/common/components/UserAvatar";
import StatusBadge from "@/app/common/components/StatusBadge";
import {
  cn,
  formatPrice,
  jobSalaryTypeToLabel,
  jobTypeEnumToLabel,
} from "@/app/common/utils";
import { EmptyStateV3 } from "@/app/common/components/dashboard/EmptyState";

const RecentlyAppliedTable = ({
  data,
  isApplicationsPage,
}: {
  data: JobApplication[];
  isApplicationsPage?: boolean;
}) => {
  const applicationsHref = "/talents/applications";
  return (
    <>
      <div className='w-full rounded-t-xl pl-6 pr-2 h-20 border border-[#F5F5F5] bg-[#EBECEE] flex items-center justify-between'>
        <h2 className='text-base md:text-lg font-semibold text-[#343A40]'>
          Recently Applied
        </h2>
        <div className='border-l flex items-center'>
          <button className='btn btn-sm btn-ghost bg-white mx-[14px]'>
            <SortIcon />
          </button>
          <Link
            href={applicationsHref}
            className={cn(
              "btn btn-ghost bg-white",
              isApplicationsPage && "hidden"
            )}
          >
            View All
          </Link>
        </div>
      </div>
      <ScrollArea className='border border-t-0 border-[#E1E3E5] rounded-b-xl flex-1 max-lg:max-w-[calc(100svw_-_1.5rem)]'>
        <table className='table table-zebra'>
          {/* head */}
          <thead className='text-xs text-[#667085] font-medium'>
            <tr>
              <th
                className={cn("max-md:hidden", !isApplicationsPage && "hidden")}
              >
                S/N
              </th>
              <th>Company</th>
              <th>Role</th>
              <th className='max-md:hidden'>Date Applied</th>
              <th>Job Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody className='text-sm text-[#101828]'>
            {data.length ? (
              data.map((app, i) => {
                const [minSalary, maxSalary] = (app.job.payment_range ?? "")
                  .split("-")
                  .map(s => s.trim())
                  .map(s => parseInt(s));
                return (
                  <tr key={app.id}>
                    <td
                      className={cn(
                        "max-md:hidden",
                        !isApplicationsPage && "hidden"
                      )}
                    >
                      {i + 1}
                    </td>
                    <td
                      className={cn(
                        "flex items-center gap-2",
                        isApplicationsPage && "gap-3"
                      )}
                    >
                      <UserAvatar
                        profilePic={app.company_logo}
                        firstName={app.company_name}
                        lastName={app.company_name?.split(" ").at(1) ?? ""}
                        className={isApplicationsPage ? "w-10" : "w-6 text-xs"}
                      />
                      <div>
                        <h6
                          className={cn(
                            "font-medium text-[#101828]",
                            isApplicationsPage ? "text-sm" : "text-xs"
                          )}
                        >
                          {app.company_name}
                        </h6>
                        <div
                          className={cn(
                            "text-xs text-[#667085] font-inter flex items-center gap-4",
                            !isApplicationsPage &&
                              "text-[10px] text-secondary-black"
                          )}
                        >
                          <div className='flex items-center gap-1'>
                            {/* <CiLocationOn className='text-sm text-[##D6D7D9]' /> */}
                            <LocationIcon />
                            <p>{app.job.location}</p>
                          </div>
                          <div className='flex items-center gap-1'>
                            <MoneyRecieveIcon />
                            <p>
                              {minSalary
                                ? `${formatPrice({
                                    price: minSalary,
                                    currencyCode: app.job.payment_currency,
                                    noOfDigits: 0,
                                  })} - ${
                                    isNaN(maxSalary)
                                      ? "above"
                                      : formatPrice({
                                          price: maxSalary,
                                          currencyCode:
                                            app.job.payment_currency,
                                          noOfDigits: 0,
                                        })
                                  }`
                                : "N/A"}
                              {jobSalaryTypeToLabel(app.job.salary_duration)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      className={cn(
                        "text-[#2E2E2E] text-xs font-inter",
                        isApplicationsPage && "text-sm"
                      )}
                    >
                      {app.job.title}
                    </td>
                    {/* Mar 18, 2023 . 10:59am */}
                    <td
                      className={cn(
                        "text-[#101828] text-sm font-inter max-md:hidden",
                        !isApplicationsPage && "text-xs font-medium"
                      )}
                    >
                      {format(
                        new Date(app.applied_date),
                        "MMM dd, yyyy . hh:mma"
                      )}
                    </td>
                    <td>
                      <StatusBadge
                        status={jobTypeEnumToLabel(app.job.job_type) as any}
                      />
                    </td>
                    <td>
                      <StatusBadge status={app.status.toLowerCase() as any} />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isApplicationsPage ? 6 : 5}>
                  <EmptyStateV3
                    text='No Job Application'
                    subText='When you apply for a job, it will appear here'
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
    </>
  );
};

export default RecentlyAppliedTable;

const MoneyRecieveIcon = (props: IconBaseProps) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='14'
    height='14'
    viewBox='0 0 14 14'
    fill='none'
    {...props}
  >
    <path
      d='M7.61282 9.4793H6.51617C5.74033 9.4793 5.10449 8.82597 5.10449 8.02097C5.10449 7.7818 5.30283 7.58347 5.54199 7.58347C5.78116 7.58347 5.97949 7.7818 5.97949 8.02097C5.97949 8.3418 6.21867 8.6043 6.51617 8.6043H7.61282C7.84032 8.6043 8.02116 8.40013 8.02116 8.1493C8.02116 7.8343 7.93366 7.78763 7.73533 7.71763L5.97949 7.10513C5.60616 6.9768 5.10449 6.70264 5.10449 5.84514C5.10449 5.11597 5.682 4.51514 6.38783 4.51514H7.48448C8.26032 4.51514 8.89616 5.16847 8.89616 5.97347C8.89616 6.21264 8.69783 6.41097 8.45866 6.41097C8.21949 6.41097 8.02116 6.21264 8.02116 5.97347C8.02116 5.65264 7.78198 5.39014 7.48448 5.39014H6.38783C6.16033 5.39014 5.97949 5.5943 5.97949 5.84514C5.97949 6.16014 6.06699 6.2068 6.26532 6.2768L8.02116 6.8893C8.39449 7.01763 8.89616 7.2918 8.89616 8.1493C8.89616 8.8843 8.31865 9.4793 7.61282 9.4793Z'
      fill='#D6D7D9'
    />
    <path
      d='M7 10.0625C6.76083 10.0625 6.5625 9.86417 6.5625 9.625V4.375C6.5625 4.13583 6.76083 3.9375 7 3.9375C7.23917 3.9375 7.4375 4.13583 7.4375 4.375V9.625C7.4375 9.86417 7.23917 10.0625 7 10.0625Z'
      fill='#D6D7D9'
    />
    <path
      d='M7.00033 13.2707C3.54116 13.2707 0.729492 10.459 0.729492 6.99984C0.729492 3.54067 3.54116 0.729004 7.00033 0.729004C7.23949 0.729004 7.43783 0.927337 7.43783 1.1665C7.43783 1.40567 7.23949 1.604 7.00033 1.604C4.02533 1.604 1.60449 4.02484 1.60449 6.99984C1.60449 9.97484 4.02533 12.3957 7.00033 12.3957C9.97533 12.3957 12.3962 9.97484 12.3962 6.99984C12.3962 6.76067 12.5945 6.56234 12.8337 6.56234C13.0728 6.56234 13.2712 6.76067 13.2712 6.99984C13.2712 10.459 10.4595 13.2707 7.00033 13.2707Z'
      fill='#D6D7D9'
    />
    <path
      d='M12.2503 4.52083H9.91699C9.67783 4.52083 9.47949 4.3225 9.47949 4.08333V1.75C9.47949 1.51083 9.67783 1.3125 9.91699 1.3125C10.1562 1.3125 10.3545 1.51083 10.3545 1.75V3.64583H12.2503C12.4895 3.64583 12.6878 3.84417 12.6878 4.08333C12.6878 4.3225 12.4895 4.52083 12.2503 4.52083Z'
      fill='#D6D7D9'
    />
    <path
      d='M9.91651 4.52068C9.80568 4.52068 9.69484 4.47984 9.60734 4.39234C9.43818 4.22318 9.43818 3.94318 9.60734 3.77401L12.524 0.857344C12.6932 0.688177 12.9732 0.688177 13.1423 0.857344C13.3115 1.02651 13.3115 1.30651 13.1423 1.47568L10.2257 4.39234C10.1382 4.47984 10.0273 4.52068 9.91651 4.52068Z'
      fill='#D6D7D9'
    />
  </svg>
);

const LocationIcon = (props: IconBaseProps) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='14'
    height='14'
    viewBox='0 0 14 14'
    fill='none'
    {...props}
  >
    <path
      d='M6.99969 8.266C5.75719 8.266 4.74219 7.25684 4.74219 6.0085C4.74219 4.76017 5.75719 3.75684 6.99969 3.75684C8.24219 3.75684 9.25719 4.766 9.25719 6.01434C9.25719 7.26267 8.24219 8.266 6.99969 8.266ZM6.99969 4.63184C6.24135 4.63184 5.61719 5.25017 5.61719 6.01434C5.61719 6.7785 6.23552 7.39684 6.99969 7.39684C7.76385 7.39684 8.38219 6.7785 8.38219 6.01434C8.38219 5.25017 7.75802 4.63184 6.99969 4.63184Z'
      fill='#D6D7D9'
    />
    <path
      d='M6.99998 13.2765C6.13665 13.2765 5.26748 12.9498 4.59081 12.3023C2.86998 10.6457 0.968314 8.00317 1.68581 4.859C2.33331 2.0065 4.82415 0.729004 6.99998 0.729004C6.99998 0.729004 6.99998 0.729004 7.00581 0.729004C9.18165 0.729004 11.6725 2.0065 12.32 4.86484C13.0316 8.009 11.13 10.6457 9.40915 12.3023C8.73248 12.9498 7.86331 13.2765 6.99998 13.2765ZM6.99998 1.604C5.30248 1.604 3.12081 2.50817 2.54331 5.0515C1.91331 7.799 3.63998 10.1673 5.20331 11.6665C6.21248 12.6407 7.79331 12.6407 8.80248 11.6665C10.36 10.1673 12.0866 7.799 11.4683 5.0515C10.885 2.50817 8.69748 1.604 6.99998 1.604Z'
      fill='#D6D7D9'
    />
  </svg>
);
