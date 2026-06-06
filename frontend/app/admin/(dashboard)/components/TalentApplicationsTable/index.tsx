import { type PropsWithChildren } from "react";

import { cn } from "@/app/common/utils";
import { Talent } from "@/app/common/types";
import SearchBar from "@/app/common/components/SearchBar";
import ScrollArea from "@/app/common/components/ScrollArea";
import StatusBadge from "@/app/common/components/StatusBadge";
import UserApplicationActions from "../UserApplicationActions";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import { AvatarWithVerifiedBadge } from "@/app/common/components/UserAvatar";

type BaseProps = PropsWithChildren<{
  data: Talent[];
  hasActionCol?: boolean;
  className?: string;
}>;

const BaseTable = ({ data, children, hasActionCol, className }: BaseProps) => {
  return (
    <>
      <ScrollArea
        className={cn(
          "border border-t-0 rounded-b-lg dashboard-content-constraint",
          className
        )}
      >
        <table className='table table-zebra'>
          {/* head */}
          <thead>
            <tr>
              <th className='max-sm:hidden'>Talent ID</th>
              <th>Talents</th>
              <th className='max-sm:hidden'>Role</th>
              <th>Country</th>
              <th>Portfolio</th>
              <th>Resume</th>
              <th>Status</th>
              {hasActionCol && <th />}
            </tr>
          </thead>
          <tbody>
            {data.length ? (
              children
            ) : (
              <tr>
                <td colSpan={hasActionCol ? 7 : 6}>
                  <EmptyState text='There are currently no talent applications...' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
    </>
  );
};

const className =
  "select select-sm select-bordered text-[#2E2E2E] font-medium join-item focus:outline-none";
const searchKey = "talent-applications";

const TalentApplicationsTable = ({ data = [] }: { data: Talent[] }) => {
  return (
    <>
      <div className='w-full pl-6 pr-2 py-[14px] bg-[#D9DDFF] mb-8 flex max-sm:flex-col sm:items-center gap-1 justify-between'>
        <SearchBar searchKey={searchKey} querySearch />
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
      <h3 className='my-8 text-lg font-medium text-gray-900'>Talent Details</h3>
      <BaseTable hasActionCol data={data} className='border-t rounded'>
        {data.map(talent => (
          <tr key={talent.pk}>
            <td className='max-sm:hidden'>{talent.pk}</td>
            <td className='flex items-center gap-2'>
              <AvatarWithVerifiedBadge
                profilePic={talent.profile_pic}
                firstName={talent.first_name}
                lastName={talent.last_name}
                className='w-10'
                verified={talent.has_passed_assessment}
              />
              <div className='font-medium'>
                <h6 className='text-[#101828] capitalize'>
                  {talent.first_name} {talent.last_name}
                </h6>
                <p className='text-[#667085]'>{talent.email}</p>
              </div>
            </td>
            <td className='max-sm:hidden text-[#2E2E2E] capitalize'>
              {talent.role}
            </td>
            <td>{talent.country}</td>
            <td>
              <a
                href={talent.portfolio}
                target='_blank'
                rel='noreferrer'
                className='line-clamp-1 hover:text-primary'
              >
                {talent.portfolio}
              </a>
            </td>
            <td>
              <a
                href={talent.resume}
                target='_blank'
                rel='noreferrer'
                className='line-clamp-1 hover:text-primary'
              >
                {talent.resume}
              </a>
            </td>
            <td>
              <StatusBadge
                status={talent.verified ? "approved" : "pending"}
                hideDot
              />
            </td>
            <td>
              <UserApplicationActions id={talent.pk} />
            </td>
          </tr>
        ))}
      </BaseTable>
    </>
  );
};

export default TalentApplicationsTable;
