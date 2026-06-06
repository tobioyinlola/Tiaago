"use client";

import Link from "next/link";

import Modal from "../Modal";
import { BASE_URL } from "../../constants";
import CopyToClipboard from "../CopyToClipboard";
import { CalendarEvent } from "./V2/calendar.types";

type JoinMeetingModalProps = {
  modalRef: React.RefObject<HTMLDialogElement>;
  currentEvent?: CalendarEvent;
};

const JoinMeetingModal = ({
  modalRef,
  currentEvent,
}: JoinMeetingModalProps) => {
  const link = `/call/${currentEvent?.resource?.room_name}?token=${currentEvent?.resource?.token}`;
  return (
    <Modal id='join-meeting-modal' modalRef={modalRef} autoHeight>
      <div>
        <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
          {currentEvent?.title || "Join meeting"}
        </h3>
        <p className='text-[#999] text-sm -tracking-[0.1px]'>
          You&apos;ve a new meeting! Join colleagues to collaborate on this
          project.
        </p>
        <div className='mt-6 border-t py-8'>
          <div className='form-control w-full'>
            <label className='label label-text text-gray-700 font-medium'>
              Link to Meeting
            </label>
            <div className='flex'>
              <input
                className='input input-bordered w-full input-primary bg-white'
                type='url'
                disabled
                value={BASE_URL + link}
              />
              <CopyToClipboard text={BASE_URL + link} />
            </div>
          </div>
        </div>
        <Link href={link} className='btn btn-primary w-full my-6'>
          Join meeting
        </Link>
      </div>
    </Modal>
  );
};

export default JoinMeetingModal;
