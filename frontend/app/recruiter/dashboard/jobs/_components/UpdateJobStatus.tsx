"use client";

import { toast } from "sonner";
import { useState } from "react";
import Button from "@/app/common/components/DaisyButton";

import { Job } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { updateJobStatus } from "@/app/common/services/jobs";
import { handleFormSubmissionError } from "@/app/common/utils";

const options: { label: string; value: Job["job_status"] }[] = [
  { label: "Active", value: "ACTIVE" },
  { label: "On Hold (Temporarily suspend applications)", value: "ON_HOLD" },
  { label: "Hired", value: "HIRED" },
  //   {label: "Expired", value: "EXPIRED"},
];

const UpdateJobStatus = ({ job }: { job: Job }) => {
  const setAlert = useAlert(s => s.setAlert);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Job["job_status"]>(job.job_status);

  const handleUpdateJobStatus = async (status: Job["job_status"]) => {
    try {
      setLoading(true);
      const res = await updateJobStatus(job.public_id, status);
      if (res.success) {
        toast.success("Job status updated successfully");
      } else {
        handleFormSubmissionError(res.error, undefined, setAlert);
      }
    } catch (error) {
      handleFormSubmissionError(error, undefined, setAlert);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!status) return;
    handleUpdateJobStatus(status);
  };

  return (
    <form
      className='flex max-sm:flex-col sm:items-center gap-2'
      onSubmit={onSubmit}
    >
      <h4 className='text-[#101828] text-base sm:text-lg font-medium'>
        Update Job Status
      </h4>
      <select
        className='select select-primary select-sm sm:select-md h-10'
        value={status}
        onChange={e => setStatus(e.target.value as Job["job_status"])}
        disabled={loading}
      >
        <option value='' disabled>
          Select Status
        </option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Button
        type='submit'
        loading={loading}
        className='btn btn-primary btn-sm sm:btn-md h-10'
      >
        Update
      </Button>
    </form>
  );
};

export default UpdateJobStatus;
