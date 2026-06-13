import { LuExternalLink } from "react-icons/lu";

import { Startup } from "@/app/common/types";
import { cn, isBasicUser } from "@/app/common/utils";
import SearchBar from "@/app/common/components/SearchBar";
import ScrollArea from "@/app/common/components/ScrollArea";
import UserAvatar from "@/app/common/components/UserAvatar";
import StatusBadge from "@/app/common/components/StatusBadge";
import StartupDetailPanel from "../StartupDetailPanel";
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
              <th className='max-sm:hidden'>Account Type</th>
              <th className='max-sm:hidden'>Industry</th>
              <th className='max-sm:hidden'>Onboarding</th>
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
                      <h6 className='text-foreground'>{startup.company_name}</h6>
                      <p className='text-muted-foreground'>{startup.email}</p>
                    </div>
                  </td>
                  <td className='max-sm:hidden text-foreground'>
                    {startup.size || "—"}
                  </td>
                  <td>{startup.country}</td>
                  <td className='max-sm:hidden capitalize'>
                    {startup.account_type?.replace("-", " ") || "—"}
                  </td>
                  <td className='max-sm:hidden'>
                    {startup.industry || "—"}
                  </td>
                  <td className='max-sm:hidden'>
                    {startup.onboarding_completed_at
                      ? "Completed"
                      : startup.onboarding_skipped_at
                      ? "Skipped"
                      : "Pending"}
                  </td>
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
                    <div className='flex items-center gap-2'>
                      <StartupDetailPanel startup={startup} />
                      {!!startup.website && (
                        <a
                          href={startup.website}
                          target='_blank'
                          rel='noreferrer'
                          aria-label={`Open ${startup.company_name} website`}
                          className='rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
                        >
                          <LuExternalLink className='h-3.5 w-3.5' />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10}>
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
    "select select-sm select-bordered text-foreground font-medium join-item focus:outline-none";
  return (
    <div className='w-full pl-6 pr-2 py-[14px] bg-primary/10 mb-8 flex max-sm:flex-col sm:items-center gap-1 justify-between'>
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
