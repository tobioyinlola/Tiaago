import ScrollArea from "@/app/common/components/ScrollArea";
import { getSchedule } from "@/app/common/services/schedule";
import CalendarV2 from "@/app/common/components/Calendar/V2";
import StatusBadge from "@/app/common/components/StatusBadge";
import RecruiterMeetingRequestActions from "./_components/RecruiterMeetingRequestActions";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

export const metadata = {
  title: "Schedule",
};

const SchedulePage = async () => {
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const schedule = await getSchedule().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get schedule error (recruiters schedule page): ", error);
    errors.push({
      message: error,
      title: "Error getting schedule",
    });
    return [];
  });
  const meeetingRequests = schedule.filter(meeting => !meeting.accepted);
  const scheduledEvents = schedule.filter(meeting => meeting.accepted);

  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='p-8 max-md:px-1 flex flex-col gap-6 sm:gap-8 dashboard-content-constraint'>
        <div className='border-b border-gray-200 pb-1'>
          <h1 className='text-2xl font-space-grotesk font-semibold mb-1'>
            Schedule
          </h1>
          <p className='text-gray-900 text-base'>
            Let&apos;s see what you have on your schedule for today
          </p>
        </div>

        <div className='collapse collapse-arrow bg-base-100 mt-2 dashboard-content-constraint'>
          <input type='checkbox' />
          <div className='collapse-title text-xl font-medium'>
            <span className='text-base-content'>Meeting Requests</span>
            <span className='badge badge-primary ml-2'>
              {meeetingRequests.length}
            </span>
          </div>
          <div className='collapse-content'>
            {meeetingRequests.length ? (
              <ScrollArea className='dashboard-content-constraint'>
                <table className='table w-full'>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Description</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {meeetingRequests.map((meeting, i) => (
                      <tr key={i}>
                        <td>{meeting.title}</td>
                        <td>{meeting.description}</td>
                        <td>{meeting.meeting_date}</td>
                        <td>
                          {meeting.start_time.split(":").slice(0, 2).join(":")}{" "}
                          - {meeting.end_time.split(":").slice(0, 2).join(":")}
                        </td>
                        <td>
                          <StatusBadge
                            status={
                              meeting.accepted === false
                                ? "rejected"
                                : "pending"
                            }
                            hideDot
                          />
                        </td>
                        <td>
                          <RecruiterMeetingRequestActions id={meeting.id} />
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

        <CalendarV2 scheduledEvents={scheduledEvents} />
      </div>
    </>
  );
};

export default SchedulePage;
