"use client";
import "react-datepicker/dist/react-datepicker.css";

import { toast } from "sonner";
import Select from "react-select";
import dynamic from "next/dynamic";
import { addDays } from "date-fns";
import { Button } from "react-daisyui";
import { isNullOrUndef } from "@/app/common/utils";
import { useEffect, useRef, useState } from "react";

import { ButtonModal } from "../Modal";
import { ID, TalentRole } from "../../types";
import { useAlert } from "../../store/useAlert";
import { handleFormSubmissionError } from "../../utils";
import { createContract } from "../../services/contract";

const DatePicker = dynamic(() => import("react-datepicker"), {
  ssr: false,
});

type Props = {
  talentID: ID;
  name?: string;
  buttonClassName?: string;
  roles: TalentRole[];
  defaultRole?: ID;
};

const getInitialDate = () => {
  const date = addDays(new Date(), 30);
  date.setHours(23);
  date.setMinutes(59);
  date.setSeconds(59);
  return date;
};

const CreateContractModal = ({
  talentID,
  name = "this talent",
  buttonClassName = "btn-primary",
  roles,
  defaultRole,
}: Props) => {
  const [pay, setPay] = useState(0);
  const [currency, setCurrency] = useState("NGN");
  const [prevDefaultRole, setPrevDefaultRole] = useState(defaultRole);
  const [role, setRole] = useState(defaultRole);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState(getInitialDate());
  const handleDateChange = (date: Date) => setDate(date);
  const setAlert = useAlert(state => state.setAlert);
  const roleOptions = roles.map(r => ({ value: r.id, label: r.title }));

  if (defaultRole !== prevDefaultRole) {
    setPrevDefaultRole(defaultRole);
    setRole(defaultRole);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await createContract(talentID, {
        role: role!,
        value: pay,
        currency,
        expires: date.toISOString(),
      });
      if (res.success) {
        toast.success("Contract created successfully");
        modalRef.current?.close();
      } else {
        handleFormSubmissionError(res.error, undefined, setAlert);
      }
    } catch (e) {
      handleFormSubmissionError(e, undefined, setAlert);
    }
    setLoading(false);
  };

  return (
    <ButtonModal
      buttonText='Create Contract'
      buttonClassName={buttonClassName}
      id='create-contract-modal'
      disableClose={loading}
      modalRef={modalRef}
    >
      <div className='p-1 w-[80svw] max-w-md'>
        <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold'>
          Create Contract
        </h3>
        <p className='text-[#999] text-sm -tracking-[0.1px]'>
          Create a Contract with {name}
        </p>
        <div className='divider' />
        <form className='' onSubmit={handleSubmit}>
          <label className='label label-text text-gray-700 font-medium'>
            Job Role
          </label>
          <Select
            instanceId='select-role'
            inputId='select-role'
            options={roleOptions}
            value={roleOptions.find(r => r.value === role)}
            onChange={e => e && setRole(e.value)}
            required
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
                backgroundColor: state.isFocused ? "var(--primary)" : "#fff",
                color: state.isFocused ? "#fff" : "var(--primary)",
              }),
            }}
          />
          <label className='label label-text text-gray-700 font-medium mt-4'>
            Pay
          </label>
          <div className='input input-bordered w-full flex items-center gap-2 relative'>
            <select
              className='absolute pl-3.5 bottom-1/2 z-[1] h-12 bg-transparent border-0 rounded-lg translate-y-1/2 left-0 focus:outline-none'
              value={currency}
              onChange={e => setCurrency(e.target.value)}
            >
              <option value='USD'>USD</option>
              <option value='NGN'>NGN</option>
            </select>
            <input
              type='number'
              className='grow pl-16'
              value={pay}
              onChange={e => setPay(parseFloat(e.target.value))}
              required
            />
          </div>
          <div className='w-full'>
            <label className='label label-text text-gray-700 font-medium mt-4'>
              Contract expiry date
            </label>
            <DatePicker
              selected={date}
              onChange={handleDateChange}
              showTimeSelect
              showIcon
              dateFormat='Pp'
              minDate={addDays(new Date(), 1)}
              customInput={<input className='grow !pl-7' />}
              wrapperClassName='w-full'
            />
          </div>
          <Button
            color='primary'
            className='w-full my-4'
            type='submit'
            disabled={!pay || isNullOrUndef(role) || !date}
            //   onClick={scheduleMeeting}
            loading={loading}
          >
            Create Contract
          </Button>
        </form>
      </div>
    </ButtonModal>
  );
};

export default CreateContractModal;
