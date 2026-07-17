"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import Button from "@/app/common/components/DaisyButton";
import { useRouter } from "next/navigation";
import { LuExternalLink } from "react-icons/lu";
import { HiOutlineUsers } from "react-icons/hi2";

import {
  handleFormSubmissionError,
  jobTypeEnumToLabel,
} from "@/app/common/utils";
import { Job } from "@/app/common/types";
import { deleteJob } from "@/app/common/services/jobs";
import ScrollArea from "@/app/common/components/ScrollArea";
import StatusBadge from "@/app/common/components/StatusBadge";
import EmptyState from "@/app/common/components/dashboard/EmptyState";
import { useAlert } from "@/app/common/store/useAlert";
import { Trash2Icon } from "lucide-react";

const JobsPostedTable = ({ jobs = [] }: { jobs: Job[] }) => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const setAlert = useAlert(s => s.setAlert);

  const handleDeleteJob = async (publicId: string) => {
    setIsDeleting(true);
    try {
      const response = await deleteJob(publicId);
      if (response?.success) {
        toast.success("Job deleted successfully");
        router.refresh();
        setIsDeleting(false);
      } else {
        handleFormSubmissionError(
          response?.error || "Failed to delete job",
          undefined,
          setAlert
        );
        setIsDeleting(false);
      }
    } catch (error) {
      handleFormSubmissionError(error, undefined, setAlert);
      setIsDeleting(false);
    }
  };

  const confirmDeleteJob = (publicId: string) => {
    if (isDeleting) return;
    setAlert({
      title: "Delete Job",
      message: "Are you sure you want to delete this job?",
      buttonAction: () => handleDeleteJob(publicId),
      buttonClassName: "btn btn-error",
      icon: "error",
    });
  };

  return (
    <ScrollArea className='border rounded my-8 dashboard-content-constraint'>
      <table className='table table-zebra text-sm'>
        {/* head */}
        <thead>
          <tr>
            <th className='max-sm:hidden'>S/N</th>
            <th>Job Posted</th>
            <th>Applications</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody className='text-[#101828]'>
          {jobs.length ? (
            jobs.map((job, i) => (
              <tr key={job.id}>
                <td className='max-sm:hidden'>{i + 1}</td>
                <td>
                  <h6 className='text font-medium '>{job.title}</h6>
                  <p className='text-[#667085] text-xs'>
                    {jobTypeEnumToLabel(job.job_type)}
                  </p>
                </td>
                <td className='flex items-center'>
                  <HiOutlineUsers className='text-lg mr-1' />
                  <p>
                    {job.no_of_applications}
                    <span className='ml-1 max-md:hidden'>
                      Application{job.no_of_applications !== 1 ? "s" : ""}
                    </span>
                  </p>
                </td>
                <td>
                  <StatusBadge status={job.job_status.toLowerCase() as any} />
                </td>
                <td className='flex items-center justify-between gap-2'>
                  <div className='flex items-center gap-3.5'>
                    <Link
                      href={`/recruiter/dashboard/jobs/edit/${job.public_id}`}
                      className='font-medium max-md:hidden text-primary hover:text-primary/80'
                      title='Edit Job'
                    >
                      Edit
                    </Link>
                    <a
                      href={`/recruiter/dashboard/jobs/jobs-posted/${job.public_id}/applications`}
                      className='font-medium max-md:hidden text-primary'
                    >
                      View Applications
                    </a>
                  </div>
                  <div className='flex items-center gap-3'>
                    <Link target='_blank' href={job.detail_url || "#"}>
                      <LuExternalLink className='text-base text-[#7F7F7F]' />
                    </Link>

                    <button
                      onClick={() => confirmDeleteJob(job.public_id)}
                      className='cursor-pointer'
                    >
                      <Trash2Icon className='text-base text-[#7F7F7F] hover:text-red-500' />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6}>
                <EmptyState text='You are yet to post a job...' />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </ScrollArea>
  );
};

export default JobsPostedTable;
