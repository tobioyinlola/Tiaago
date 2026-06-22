"use client";
import { toast } from "sonner";
import { useState } from "react";
import Button from "@/app/common/components/DaisyButton";
import { useRouter } from "next/navigation";

import { ID } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import axiosInstance from "@/app/common/utils/axios.instance";
import { handleFormSubmissionError } from "@/app/common/utils";

const ApproveJob = ({ id, approved }: { id: ID; approved: boolean }) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const approveJob = () => {
    setLoading(true);
    axiosInstance
      .patch(`/jobs/${id}/admin-approve/`, {
        was_approved: true,
      })
      .then(() => {
        toast.success("Job approved successfully");
        router.push("/admin/jobs?tab=approved");
      })
      .catch(error => {
        handleFormSubmissionError(error, undefined, setAlert);
      })
      .finally(() => {
        setLoading(false);
      });
  };
  return (
    <Button
      loading={loading}
      disabled={approved}
      color='primary'
      onClick={approveJob}
    >
      Approve{approved ? "d" : ""}
    </Button>
  );
};

export const DeactivateJob = ({
  id,
  deactivated,
}: {
  id: ID;
  deactivated: boolean;
}) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const deactivateJob = async () => {
    try {
      await axiosInstance.patch(`/jobs/${id}/admin-approve/`, {
        was_approved: false,
      });

      toast.success("Job deactivated successfully");
      router.push("jobs?tab=pending");
    } catch (error) {
      setTimeout(() => {
        handleFormSubmissionError(error, undefined, setAlert);
      }, 300);
    }
  };

  const requestDeactivation = () =>
    setAlert({
      icon: "warning",
      title: "Are you sure?",
      message: "This action cannot be undone",
      buttonText: "Deactivate",
      buttonAction: deactivateJob,
      buttonClassName: "btn-error",
    });
  return (
    <Button
      disabled={deactivated}
      variant='link'
      className='no-underline link-error hover:no-underline'
      onClick={requestDeactivation}
    >
      Deactivate{deactivated ? "d" : ""}
    </Button>
  );
};

export default ApproveJob;
