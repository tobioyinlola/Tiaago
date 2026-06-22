"use client";
import { toast } from "sonner";
import { AxiosError } from "axios";
import Button from "@/app/common/components/DaisyButton";
import { useRouter } from "next/navigation";
import { useState, FormEvent, useRef } from "react";

import { toId } from "@/app/common/utils";
import { TalentRole } from "@/app/common/types";
import { IS_DEV } from "@/app/common/constants";
import { ButtonModal } from "@/app/common/components/Modal";
import axiosInstance from "@/app/common/utils/axios.instance";

const AddNewRole = ({ refresh = false, buttonClassName = "btn-primary" }) => {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTechnical, setIsTechnical] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);

  const addRole = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || !role) return;
    setLoading(true);
    try {
      await axiosInstance.post<TalentRole>("/roles/", {
        title: role,
        slug: toId(role),
        is_technical: isTechnical,
      });
      setLoading(false);
      setError("");
      toast.success("Role added successfully");
      if (refresh) router.refresh();
      modalRef.current?.close();
    } catch (error: any) {
      if (IS_DEV) console.log({ error });
      setLoading(false);
      if (error instanceof AxiosError) {
        setError(error.response?.data?.detail ?? error.message);
      } else setError(error?.message ?? "Something went wrong");
    }
  };

  return (
    <ButtonModal
      buttonText='Add New Role'
      id='add-new-role-modal'
      buttonClassName={buttonClassName}
      autoHeight
      disablePadding
      modalRef={modalRef}
      disableClose={loading}
    >
      <div className='border-b p-6'>
        <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
          Add New Role
        </h3>
        <p className='text-[#999] text-sm -tracking-[0.1px]'>
          Please check to see if all information details are correct to avoid
          wrong processing
        </p>
      </div>
      <form onSubmit={addRole} className='p-6'>
        <label className='label label-text text-gray-700 font-medium'>
          Role Name
        </label>
        <input
          type='text'
          value={role}
          onChange={e => setRole(e.target.value)}
          className='input input-bordered w-full'
        />
        <label className='label cursor-pointer justify-start gap-2 my-2'>
          <input
            checked={isTechnical}
            onChange={e => setIsTechnical(e.target.checked)}
            type='checkbox'
            className='checkbox checkbox-primary'
          />
          <span className='label-text text-[#393F47] text-base'>
            Is this a technical role?
          </span>
        </label>
        <Button
          loading={loading}
          disabled={!role}
          type='submit'
          className='btn btn-primary w-full my-6'
        >
          Continue
        </Button>
        {error && (
          <p className='text-red-500 text-sm -tracking-[0.1px]'>{error}</p>
        )}
      </form>
    </ButtonModal>
  );
};

export default AddNewRole;
