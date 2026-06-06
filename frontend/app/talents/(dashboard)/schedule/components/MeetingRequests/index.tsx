import Actions from "./Actions";
import { ScheduledMeeting } from "@/app/common/types";
import ScrollArea from "@/app/common/components/ScrollArea";

const MeetingRequests = ({
  scheduleRequests,
}: {
  scheduleRequests: ScheduledMeeting[];
}) => {
  return (
    <div className='collapse collapse-arrow bg-base-100 mt-2'>
      <input type='checkbox' />
      <div className='collapse-title text-xl font-medium'>
        <span className='text-base-content'>Meeting Requests</span>
        <span className='badge badge-primary ml-2'>
          {scheduleRequests.length}
        </span>
      </div>
      <div className='collapse-content'>
        {scheduleRequests.length ? (
          <ScrollArea className='dashboard-content-constraint'>
            <table className='table w-full'>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Company</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduleRequests.map((meeting, i) => (
                  <tr key={i}>
                    <td>{meeting.title}</td>
                    <td>{meeting.company_name}</td>
                    <td>{meeting.meeting_date}</td>
                    <td>
                      {meeting.start_time.split(":").slice(0, 2).join(":")} -{" "}
                      {meeting.end_time.split(":").slice(0, 2).join(":")}
                    </td>
                    <td>
                      <Actions id={meeting.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        ) : (
          <p className='text-center text-gray-500'>No meeting requests</p>
        )}
      </div>
    </div>
  );
};

export default MeetingRequests;
