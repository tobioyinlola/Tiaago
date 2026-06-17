import { LuExternalLink } from "react-icons/lu";

import { Talent } from "@/app/common/types";
import { cn, isBasicUser } from "@/app/common/utils";
import SearchBar from "@/app/common/components/SearchBar";
import ScrollArea from "@/app/common/components/ScrollArea";
import UserAvatar from "@/app/common/components/UserAvatar";
import StatusBadge from "@/app/common/components/StatusBadge";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import TalentDetailPanel from "../TalentDetailPanel";

type BaseProps = {
  data: Talent[];
  className?: string;
};

const BaseTable = ({ data, className }: BaseProps) => {
  return (
    <ScrollArea
      className={cn(
        "border mb-8 border-t-0 rounded-b-lg dashboard-content-constraint",
        className
      )}
    >
      <table className='table table-zebra'>
        <thead>
          <tr>
            <th className='max-sm:hidden'>S/N</th>
            <th>Talent</th>
            <th className='max-sm:hidden'>Role</th>
            <th className='max-md:hidden'>Experience</th>
            <th>Country</th>
            <th className='max-lg:hidden'>Portfolio</th>
            <th className='max-md:hidden'>Assessment</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody className='text-sm'>
          {data.length ? (
            data.map((talent, index) => (
              <tr key={talent.pk}>
                <td className='max-sm:hidden'>{index + 1}</td>
                <td>
                  <div className='flex items-center gap-2'>
                    <UserAvatar
                      profilePic={talent.profile_pic}
                      firstName={talent.first_name}
                      lastName={talent.last_name}
                      className='w-10'
                    />
                    <div className='font-medium min-w-0'>
                      <h6 className='text-[#101828] truncate'>
                        {talent.first_name} {talent.last_name}
                      </h6>
                      <p className='text-[#667085] truncate text-xs'>
                        {talent.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className='max-sm:hidden text-[#2E2E2E] capitalize'>
                  {talent.role || "—"}
                </td>
                <td className='max-md:hidden capitalize'>
                  {talent.experience_level || "—"}
                </td>
                <td>{talent.country || "—"}</td>
                <td className='max-lg:hidden'>
                  {talent.portfolio ? (
                    <a
                      href={talent.portfolio}
                      target='_blank'
                      rel='noreferrer'
                      className='text-primary hover:underline inline-flex items-center gap-1 text-xs'
                    >
                      <span className='line-clamp-1 max-w-[120px]'>
                        {talent.portfolio.replace(/^https?:\/\//, "")}
                      </span>
                      <LuExternalLink className='h-3 w-3 shrink-0' />
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className='max-md:hidden'>
                  <StatusBadge
                    status={talent.has_passed_assessment ? "approved" : "pending"}
                    hideDot
                  />
                </td>
                <td>
                  <StatusBadge
                    status={
                      !talent.subscribed_plan
                        ? "active"
                        : isBasicUser(talent)
                          ? "basic"
                          : "pro"
                    }
                    hideDot
                  />
                </td>
                <td>
                  <TalentDetailPanel talent={talent} />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9}>
                <EmptyState text='There are currently no talents...' />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </ScrollArea>
  );
};

const TalentsTable = ({ data }: BaseProps) => {
  const className =
    "select select-sm select-bordered text-[#2E2E2E] font-medium join-item focus:outline-none";
  return (
    <>
      <div className='w-full pl-6 pr-2 py-[14px] bg-primary/10 mb-8 flex max-sm:flex-col sm:items-center gap-1 justify-between'>
        <SearchBar />
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
      <BaseTable data={data} className='border-t rounded' />
    </>
  );
};

export default TalentsTable;
