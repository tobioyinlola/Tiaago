import { Startup } from "@/app/common/types";
import SearchBar from "@/app/common/components/SearchBar";
import ScrollArea from "@/app/common/components/ScrollArea";
import UserAvatar from "@/app/common/components/UserAvatar";
import StatusBadge from "@/app/common/components/StatusBadge";
import UserApplicationActions from "../UserApplicationActions";
import StartupDetailPanel from "../StartupDetailPanel";
import EmptyState from "@/app/common/components/dashboard/EmptyState";

const selectClassName =
  "select select-sm select-bordered text-foreground font-medium join-item focus:outline-none";

const StartupApplicationsTable = ({ data = [] }: { data: Startup[] }) => {
  return (
    <>
      <div className='w-full pl-6 pr-2 py-3.5 bg-primary/10 mb-8 flex max-sm:flex-col sm:items-center gap-1 justify-between'>
        <SearchBar searchKey='startup-applications' querySearch />
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
        Startup Details
      </h3>

      <ScrollArea className='border border-t rounded rounded-b-lg dashboard-content-constraint'>
        <table className='table table-zebra'>
          <thead>
            <tr>
              <th className='max-sm:hidden'>Startup ID</th>
              <th>Startup</th>
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
                      <h6 className='text-foreground capitalize'>
                        {startup.first_name} {startup.last_name}
                      </h6>
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
                  <td className='max-sm:hidden'>
                    {startup.website ? (
                      <a
                        href={startup.website}
                        target='_blank'
                        rel='noreferrer'
                        className='line-clamp-1 hover:text-primary'
                        aria-label={`Open ${startup.company_name} website`}
                      >
                        {startup.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <StatusBadge
                      status={startup.verified ? "approved" : "pending"}
                      hideDot
                    />
                  </td>
                  <td>
                    <div className='flex items-center gap-2'>
                      <StartupDetailPanel
                        startup={startup}
                        showActions={!startup.verified}
                      />
                      {!startup.verified && (
                        <UserApplicationActions isStartup id={startup.pk} />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10}>
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

export default StartupApplicationsTable;
