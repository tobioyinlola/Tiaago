import { Recruiter } from "@/app/common/types";
import SearchBar from "@/app/common/components/SearchBar";
import ScrollArea from "@/app/common/components/ScrollArea";
import UserAvatar from "@/app/common/components/UserAvatar";
import StatusBadge from "@/app/common/components/StatusBadge";
import UserApplicationActions from "../UserApplicationActions";
import RecruiterDetailPanel from "../RecruiterDetailPanel";
import EmptyState from "@/app/common/components/dashboard/EmptyState";

const selectClassName =
  "select select-sm select-bordered text-foreground font-medium join-item focus:outline-none";

const RecruiterApplicationsTable = ({ data = [] }: { data: Recruiter[] }) => {
  return (
    <>
      <div className='w-full pl-6 pr-2 py-3.5 bg-primary/10 mb-8 flex max-sm:flex-col sm:items-center gap-1 justify-between'>
        <SearchBar searchKey='recruiter-applications' querySearch />
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
        Recruiter Details
      </h3>

      <ScrollArea className='border border-t rounded rounded-b-lg dashboard-content-constraint'>
        <table className='table table-zebra'>
          <thead>
            <tr>
              <th className='max-sm:hidden'>Recruiter ID</th>
              <th>Recruiter</th>
              <th className='max-sm:hidden'>Team Size</th>
              <th>Country</th>
              <th className='max-sm:hidden'>Account Type</th>
              <th className='max-sm:hidden'>Industry</th>
              <th className='max-sm:hidden'>Onboarding</th>
              <th className='max-sm:hidden'>Company URL</th>
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
                      <h6 className='text-foreground capitalize'>
                        {recruiter.first_name} {recruiter.last_name}
                      </h6>
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
                  <td className='max-sm:hidden'>
                    {recruiter.website ? (
                      <a
                        href={recruiter.website}
                        target='_blank'
                        rel='noreferrer'
                        className='line-clamp-1 hover:text-primary'
                        aria-label={`Open ${recruiter.company_name} website`}
                      >
                        {recruiter.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <StatusBadge
                      status={recruiter.verified ? "approved" : "pending"}
                      hideDot
                    />
                  </td>
                  <td>
                    <div className='flex items-center gap-2'>
                      <RecruiterDetailPanel
                        recruiter={recruiter}
                        showActions={!recruiter.verified}
                      />
                      {!recruiter.verified && (
                        <UserApplicationActions isRecruiter id={recruiter.pk} />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10}>
                  <EmptyState text='There are currently no recruiter applications...' />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollArea>
    </>
  );
};

export default RecruiterApplicationsTable;
