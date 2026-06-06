import ScrollArea from "@/app/common/components/ScrollArea";
import EmptyState from "@/app/common/components/dashboard/EmptyState";

const SavedCandidatesTable = ({ data = [] }) => {
  return (
    <ScrollArea className='border rounded my-8 dashboard-content-constraint'>
      <table className='table table-zebra'>
        {/* head */}
        <thead>
          <tr>
            <th className='max-sm:hidden'>S/N</th>
            <th>Applicant</th>
            <th>Status</th>
            <th className='max-sm:hidden'>Actions</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.length ? (
            <></>
          ) : (
            <tr>
              <td colSpan={5}>
                <EmptyState text='You are yet to save candidates...' />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </ScrollArea>
  );
};

export default SavedCandidatesTable;
