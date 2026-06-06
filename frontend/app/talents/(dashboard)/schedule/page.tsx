import { isNullOrUndef } from "chart.js/helpers";
import "react-big-calendar/lib/css/react-big-calendar.css";

import MeetingRequests from "./components/MeetingRequests";
import CalendarV2 from "@/app/common/components/Calendar/V2";
import { getSchedule } from "@/app/common/services/schedule";
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
    console.log("Get schedule error (talent schedule page): ", error);
    errors.push({
      message: error,
      title: "Error getting schedule",
    });
    return [];
  });
  const scheduleRequests = schedule.filter(meeting =>
    isNullOrUndef(meeting.accepted)
  );
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

        <MeetingRequests scheduleRequests={scheduleRequests} />

        <CalendarV2 scheduledEvents={scheduledEvents} />
      </div>
    </>
  );
};

export default SchedulePage;
