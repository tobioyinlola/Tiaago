import { LuExternalLink } from "react-icons/lu";

import { Recruiter } from "@/app/common/types";
import { cn, isBasicUser } from "@/app/common/utils";
import SearchBar from "@/app/common/components/SearchBar";
import ScrollArea from "@/app/common/components/ScrollArea";
import UserAvatar from "@/app/common/components/UserAvatar";
import StatusBadge from "@/app/common/components/StatusBadge";
import RecruiterDetailPanel from "../RecruiterDetailPanel";
import EmptyState from "@/app/common/components/dashboard/EmptyState";

type BaseProps = {
  data: Recruiter[];
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
              <th className='max-sm:hidden'>Recruiter ID</th>
              <th>Recruiter</th>
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
              data.map(recruiter => (
                <tr key={recruiter.pk}>
                  <td className='max-sm:hidden'>{recruiter.pk}</td>
                  <td className='flex items-center gap-2'>
                    <UserAvatar
                      profilePic={recruiter.profile_pic}
                      firstName={recruiter.first_name}
                      lastName={recruiter.last_name}
                      className='w-10'
                    />
                    <div className='font-medium'>
                      <h6 className='text-foreground'>{recruiter.company_name}</h6>
                      <p className='text-muted-foreground'>{recruiter.email}</p>
                    </div>
                  </td>
                  <td className='max-sm:hidden text-foreground'>
                    {recruiter.size || "—"}
                  </td>
                  <td>{recruiter.country}</td>
                  <td className='max-sm:hidden capitalize'>
                    {recruiter.account_type?.replace("-", " ") || "—"}
                  </td>
                  <td className='max-sm:hidden'>
                    {recruiter.industry || "—"}
                  </td>
                  <td className='max-sm:hidden'>
                    {recruiter.onboarding_completed_at
                      ? "Completed"
                      : recruiter.onboarding_skipped_at
                      ? "Skipped"
                      : "Pending"}
                  </td>
                  <td>
                    <p className='line-clamp-1'>{recruiter.website || "—"}</p>
                  </td>
                  <td>
                    <StatusBadge
                      status={
                        !recruiter.subscribed_plan
                          ? "active"
                          : isBasicUser(recruiter)
                          ? "basic"
                          : "pro"
                      }
                      hideDot
                    />
                  </td>
                  <td>
                    <div className='flex items-center gap-2'>
                      <RecruiterDetailPanel recruiter={recruiter} />
                      {!!recruiter.website && (
                        <a
                          href={recruiter.website}
                          target='_blank'
                          rel='noreferrer'
                          aria-label={`Open ${recruiter.company_name} website`}
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
                  <EmptyState text='There are currently no recruiters...' />
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
    <div className='w-full pl-6 pr-2 py-3.5 bg-primary/10 mb-8 flex max-sm:flex-col sm:items-center gap-1 justify-between'>
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

const RecruitersTable = ({ data, className }: BaseProps) => {
  return (
    <>
      <Header />
      <BaseTable data={data} className={cn("border-t rounded", className)} />
    </>
  );
};

export default RecruitersTable;
