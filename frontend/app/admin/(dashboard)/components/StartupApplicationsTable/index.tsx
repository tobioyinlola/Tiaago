import { type PropsWithChildren } from "react";

import { cn } from "@/app/common/utils";
import { Startup } from "@/app/common/types";
import SearchBar from "@/app/common/components/SearchBar";
import ScrollArea from "@/app/common/components/ScrollArea";
import UserAvatar from "@/app/common/components/UserAvatar";
import StatusBadge from "@/app/common/components/StatusBadge";
import UserApplicationActions from "../UserApplicationActions";
import EmptyState from "@/app/common/components/dashboard/EmptyState";

type BaseProps = PropsWithChildren<{
  data: Startup[];
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
              <th className='max-sm:hidden'>Startup ID</th>
              <th>Startup</th>
              <th className='max-sm:hidden'>Team Size</th>
              <th>Country</th>
              <th>Company URL</th>
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
                  <EmptyState text='There are currently no startup applications...' />
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
const searchKey = "startup-applications";

const StartupApplicationsTable = ({ data = [] }: { data: Startup[] }) => {
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
      <h3 className='my-8 text-lg font-medium text-gray-900'>
        Startup Details
      </h3>
      <BaseTable data={data} hasActionCol className='border-t rounded'>
        {data.map(startup => (
          <tr key={startup.pk}>
            <td className='max-sm:hidden'>{startup.pk}</td>
            <td className='flex items-center gap-2'>
              <UserAvatar
                profilePic={startup.profile_pic}
                firstName={startup.first_name}
                lastName={startup.last_name}
                className='w-10'
              />
              <div className='font-medium'>
                <h6 className='text-[#101828] capitalize'>
                  {startup.first_name} {startup.last_name}
                </h6>
                <p className='text-[#667085]'>{startup.email}</p>
              </div>
            </td>
            <td className='max-sm:hidden text-[#2E2E2E]'>{startup.size}</td>
            <td>{startup.country}</td>
            <td>
              <a
                href={startup.website}
                target='_blank'
                rel='noreferrer'
                className='line-clamp-1 hover:text-primary'
              >
                {startup.website}
              </a>
            </td>
            <td>
              <StatusBadge
                status={startup.verified ? "approved" : "pending"}
                hideDot
              />
            </td>
            <td>
              <UserApplicationActions isStartup id={startup.pk} />
            </td>
          </tr>
        ))}
      </BaseTable>
    </>
  );
};

export default StartupApplicationsTable;
