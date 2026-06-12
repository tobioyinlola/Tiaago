import { LuExternalLink } from "react-icons/lu";

import { Startup } from "@/app/common/types";
import { cn, isBasicUser } from "@/app/common/utils";
import SearchBar from "@/app/common/components/SearchBar";
import ScrollArea from "@/app/common/components/ScrollArea";
import UserAvatar from "@/app/common/components/UserAvatar";
import StatusBadge from "@/app/common/components/StatusBadge";
import EmptyState from "@/app/common/components/dashboard/EmptyState";

type BaseProps = {
  data: Startup[];
  className?: string;
};

const BaseTable = ({ data, className }: BaseProps) => {
  return (
    <>
      <ScrollArea
        className={cn(
          "border mb-8 border-t-0 rounded-b-lg dashboard-content-constraint",
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
              <th />
            </tr>
          </thead>
          <tbody className='text-sm'>
            {data.length ? (
              data.map(startup => (
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
                      <h6 className='text-[#101828]'>{startup.company_name}</h6>
                      <p className='text-[#667085]'>{startup.email}</p>
                    </div>
                  </td>
                  <td className='max-sm:hidden text-[#2E2E2E]'>
                    {startup.size || "—"}
                  </td>
                  <td>{startup.country}</td>
                  <td>
                    <p className='line-clamp-1'>{startup.website || "—"}</p>
                  </td>
                  <td>
                    <StatusBadge
                      status={
                        !startup.subscribed_plan
                          ? "active"
                          : isBasicUser(startup)
                          ? "basic"
                          : "pro"
                      }
                      hideDot
                    />
                  </td>
                  <td>
                    {!!startup.website && (
                      <a
                        href={startup.website}
                        target='_blank'
                        rel='noreferrer'
                        aria-label={`Open ${startup.company_name} website`}
                        className='text-base text-[#7F7F7F] hover:text-primary'
                      >
                        <LuExternalLink />
                      </a>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <EmptyState text='There are currently no startups...' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
    </>
  );
};

const Header = () => {
  const className =
    "select select-sm select-bordered text-[#2E2E2E] font-medium join-item focus:outline-none";
  return (
    <div className='w-full pl-6 pr-2 py-[14px] bg-[#D9DDFF] mb-8 flex max-sm:flex-col sm:items-center gap-1 justify-between'>
      <SearchBar querySearch />
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
  );
};

const StartupsTable = ({ data, className }: BaseProps) => {
  return (
    <>
      <Header />
      <BaseTable data={data} className={cn("border-t rounded", className)} />
    </>
  );
};

export default StartupsTable;
