"use client";
import Select from "react-select";
import Button from "@/app/common/components/DaisyButton";
import { useRef, useState } from "react";
import { addMinutes, format, isBefore, isSameDay } from "date-fns";

import Modal from "../../Modal";
import DatePicker from "./DatePicker";
import { ID } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { timeOptions, timeZoneOptions } from "./constants";
import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { cn, handleFormSubmissionError } from "@/app/common/utils";

type ScheduleMeetingInput = {
  start: Date;
  end: Date;
  title: string;
  timezone: string;
  addedParticipants: string[];
  description: string;
};

const ScheduleMeetingModal = ({
  talentID,
  name = "this talent",
  buttonClassName = "btn-primary",
  disableScheduleMeeting,
}: {
  talentID: ID;
  name?: string;
  buttonClassName?: string;
  disableScheduleMeeting?: boolean;
}) => {
  const [input, setInput] = useState<Partial<ScheduleMeetingInput>>({
    timezone: "GMT+1",
  });
  const setReason = useAlert(s => s.setUpgradePlanReason);
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [meetingLength, setMeetingLength] = useState(30);
  const setAlert = useAlert(state => state.setAlert);
  const modalRef = useRef<HTMLDialogElement>(null);

  const scheduleMeeting = async () => {
    if (!input.start)
      return setAlert({
        title: "Meeting date is required",
        icon: "error",
      });
    if (!input.title)
      return setAlert({
        title: "Meeting title is required",
        icon: "error",
      });
    if (!input.description)
      return setAlert({
        title: "Meeting description is required",
        icon: "error",
      });
    const start_time = new Date(input.start);
    start_time.setHours(+startTime.split(":")[0]);
    start_time.setMinutes(+startTime.split(":")[1]);
    const endTime = addMinutes(start_time, meetingLength);
    // start time must be at least 30 minutes from now
    if (isBefore(addMinutes(start_time, 30), new Date()))
      return setAlert({
        title: "Meeting time must be at least 30 minutes from now",
        icon: "error",
      });
    // start time must be at least 30 minutes before end time
    if (meetingLength < 30)
      return setAlert({
        title: "Meeting duration should be at least 30 minutes",
        icon: "error",
      });
    // factor in timezone e.g: "GMT-1", "GMT0", "GMT+1"
    const offset = +input.timezone!.split("GMT")[1];
    start_time.setHours(start_time.getHours() + offset);
    endTime.setHours(endTime.getHours() + offset);
    // meeting must end the same day it starts
    if (!isSameDay(start_time, endTime))
      return setAlert({
        title: "Meeting must end the same day it starts",
        icon: "error",
      });
    // meeting must not exceed 20:00
    if (
      endTime.getHours() > 20 ||
      (endTime.getHours() === 20 && endTime.getMinutes() > 0)
    )
      return setAlert({
        title: "Meeting must not exceed 20:00",
        icon: "error",
      });
    try {
      setAlert();
      setLoading(true);
      const addedParticipants = input.addedParticipants ?? [];
      const no_of_participants = addedParticipants.length + 2;
      const data = await clientKyInstance
        .post("schedulers/", {
          json: {
            title: input.title,
            meeting_date: format(input.start, "yyyy-MM-dd"),
            start_time: startTime,
            end_time: format(endTime, "HH:mm"),
            talent: talentID,
            description: input.description,
            ...(!!no_of_participants && {
              no_of_participants,
              additional_emails: addedParticipants.join(","),
            }),
          },
        })
        .json<{ id?: string }>();
      if (data.id) {
        setInput(prev => ({
          timezone: "GMT+1",
          start: prev.start,
        }));
        setStartTime("08:00");
        setMeetingLength(30);
        setAlert({
          title: "Meeting request sent successfully",
          icon: "success",
        });
        modalRef.current?.close();
      } else {
        // show error message
        setAlert({
          title: "Failed to schedule meeting",
          icon: "error",
        });
      }
    } catch (error: any) {
      handleFormSubmissionError(error, undefined, setAlert);
    } finally {
      setLoading(false);
    }
  };

  const onButtonClick = () => {
    if (disableScheduleMeeting)
      setReason("You have reached your maximum meetings for this month");
    else modalRef.current?.showModal();
  };

  return (
    <>
      <button
        className={cn("btn font-medium text-base", buttonClassName)}
        onClick={onButtonClick}
      >
        Schedule a call
      </button>
      <Modal id='schedule-meeting' disableClose={loading} modalRef={modalRef}>
        <div className='p-1'>
          <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold'>
            Schedule Meeting
          </h3>
          <p className='text-[#999] text-sm -tracking-[0.1px]'>
            Schedule a meeting with {name}
          </p>
          <div className='divider' />
          <div className='mx-auto'>
            <DatePicker
              onSelectDate={d => setInput(prev => ({ ...prev, start: d }))}
            />
            <label className='label label-text text-gray-700 font-medium mt-4'>
              Meeting title
            </label>
            <input
              className='input input-bordered w-full'
              placeholder='Give your meeting a meaningful title'
              value={input.title ?? ""}
              onChange={({ target: { value } }) =>
                setInput(prev => ({ ...prev, title: value }))
              }
            />
            <label className='label label-text text-gray-700 font-medium mt-4'>
              Meeting description
            </label>
            <textarea
              className='textarea textarea-bordered w-full'
              placeholder='Give your meeting a meaningful description'
              value={input.description ?? ""}
              onChange={({ target: { value } }) =>
                setInput(prev => ({ ...prev, description: value }))
              }
            />
            <div className='flex items-center justify-between my-4'>
              <div className='w-[48%]'>
                <label className='label label-text text-gray-700 font-medium'>
                  Select Time
                </label>
                <Select
                  instanceId='select-time'
                  inputId='select-time'
                  options={timeOptions}
                  value={timeOptions.find(t => t.value === startTime)}
                  onChange={e => e && setStartTime(e.value)}
                  styles={{
                    control: provided => ({
                      ...provided,
                      borderColor: "var(--primary)",
                      outlineColor: "var(--primary)",
                      minHeight: "3rem",
                      borderRadius: "0.5rem",
                    }),
                    option: (provided, state) => ({
                      ...provided,
                      backgroundColor: state.isFocused
                        ? "var(--primary)"
                        : "#fff",
                      color: state.isFocused ? "#fff" : "var(--primary)",
                    }),
                  }}
                />
              </div>
              <div className='w-[48%]'>
                <label className='label label-text text-gray-700 font-medium'>
                  Select Time Zone
                </label>
                <Select
                  id='select-tz'
                  instanceId='select-tz'
                  inputId='select-tz'
                  options={timeZoneOptions}
                  value={timeZoneOptions.find(t => t.value === input.timezone)}
                  onChange={e =>
                    e && setInput(prev => ({ ...prev, timezone: e.value }))
                  }
                />
              </div>
            </div>
            <label className='label label-text text-gray-700 font-medium mt-4'>
              Duration of meeting
            </label>
            <div className='flex items-center justify-between gap-1'>
              <input
                type='number'
                className='input input-bordered w-full'
                placeholder='Duration of meeting'
                value={meetingLength}
                onChange={({ target: { valueAsNumber } }) =>
                  !isNaN(valueAsNumber) && setMeetingLength(valueAsNumber)
                }
              />
              <p>mins</p>
            </div>
            <div className='mt-4'>
              <label className='label label-text text-gray-700 font-medium'>
                Add Participants
              </label>
              <input
                type='text'
                className='input input-bordered w-full'
                placeholder='Enter emails in a comma seperated list'
                value={input.addedParticipants?.join(",") ?? ""}
                onChange={e =>
                  setInput(prev => ({
                    ...prev,
                    addedParticipants: e.target.value
                      .split(",")
                      .map(s => s.trim()),
                  }))
                }
              />
            </div>
          </div>
          <Button
            color='primary'
            className='w-full my-4'
            disabled={!input.start}
            onClick={scheduleMeeting}
            loading={loading}
          >
            Create Meeting
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default ScheduleMeetingModal;
