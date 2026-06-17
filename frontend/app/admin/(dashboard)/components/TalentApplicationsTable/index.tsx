import { LuExternalLink, LuFileText } from "react-icons/lu";

import { Talent } from "@/app/common/types";
import SearchBar from "@/app/common/components/SearchBar";
import ScrollArea from "@/app/common/components/ScrollArea";
import StatusBadge from "@/app/common/components/StatusBadge";
import UserApplicationActions from "../UserApplicationActions";
import TalentDetailPanel from "../TalentDetailPanel";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import { AvatarWithVerifiedBadge } from "@/app/common/components/UserAvatar";

const selectClassName =
  "select select-sm select-bordered text-foreground font-medium join-item focus:outline-none";

const TalentApplicationsTable = ({ data = [] }: { data: Talent[] }) => {
  return (
    <>
      <div className='w-full pl-6 pr-2 py-3.5 bg-primary/10 mb-8 flex max-sm:flex-col sm:items-center gap-1 justify-between'>
        <SearchBar searchKey='talent-applications' querySearch />
        <div className='border-l flex items-center join'>
          <select className={selectClassName} defaultValue=''>
            <option disabled value=''>
              Filter
            </option>
          </select>
          <select className={selectClassName} defaultValue=''>
            <option disabled value=''>
              From
            </option>
          </select>
          <select className={selectClassName} defaultValue=''>
            <option disabled value=''>
              To
            </option>
          </select>
        </div>
      </div>

      <h3 className='my-8 text-lg font-medium text-foreground'>
        Talent Details
      </h3>

      <ScrollArea className='border border-t rounded rounded-b-lg dashboard-content-constraint'>
        <table className='table table-zebra'>
          <thead>
            <tr>
              <th className='max-sm:hidden'>Talent ID</th>
              <th>Talent</th>
              <th className='max-sm:hidden'>Role</th>
              <th className='max-md:hidden'>Experience</th>
              <th>Country</th>
              <th className='max-lg:hidden'>Portfolio</th>
              <th className='max-md:hidden'>Resume</th>
              <th className='max-md:hidden'>Assessment</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody className='text-sm'>
            {data.length ? (
              data.map(talent => (
                <tr key={talent.pk}>
                  <td className='max-sm:hidden'>{talent.pk}</td>
                  <td>
                    <div className='flex items-center gap-2'>
                      <AvatarWithVerifiedBadge
                        profilePic={talent.profile_pic}
                        firstName={talent.first_name}
                        lastName={talent.last_name}
                        className='w-10'
                        verified={talent.has_passed_assessment}
                      />
                      <div className='font-medium min-w-0'>
                        <h6 className='text-foreground truncate capitalize'>
                          {talent.first_name} {talent.last_name}
                        </h6>
                        <p className='text-muted-foreground truncate text-xs'>
                          {talent.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className='max-sm:hidden text-foreground capitalize'>
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
                    {talent.resume ? (
                      <a
                        href={talent.resume}
                        target='_blank'
                        rel='noreferrer'
                        className='text-primary hover:underline inline-flex items-center gap-1 text-xs'
                      >
                        <LuFileText className='h-3.5 w-3.5 shrink-0' />
                        <span>View</span>
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
                      status={talent.verified ? "approved" : "pending"}
                      hideDot
                    />
                  </td>
                  <td>
                    <div className='flex items-center gap-2'>
                      <TalentDetailPanel
                        talent={talent}
                        showActions={!talent.verified}
                      />
                      {!talent.verified && (
                        <UserApplicationActions id={talent.pk} />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10}>
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

export default TalentApplicationsTable;
