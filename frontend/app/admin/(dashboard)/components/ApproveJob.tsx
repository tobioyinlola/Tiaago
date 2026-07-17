"use client";
import { toast } from "sonner";
import { useState } from "react";
import Button from "@/app/common/components/DaisyButton";
import { useRouter } from "next/navigation";

import { ID } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import clientKyInstance from "@/app/common/utils/client-ky.instance";
import { handleFormSubmissionError } from "@/app/common/utils";

const ApproveJob = ({ id, approved }: { id: ID; approved: boolean }) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const approveJob = () => {
    setLoading(true);
    clientKyInstance
      .patch(`jobs/${id}/admin-approve/`, {
        json: { was_approved: true },
      })
      .json()
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
  publicId,
  deactivated,
}: {
  publicId: string;
  deactivated: boolean;
}) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);

  const toggleStatus = async () => {
    setLoading(true);
    try {
      const newStatus = deactivated ? "ACTIVE" : "ON_HOLD";
      await clientKyInstance
        .patch(`jobs/${publicId}/`, {
          json: { job_status: newStatus },
        })
        .json();

      toast.success(deactivated ? "Job reactivated" : "Job deactivated");
      router.refresh();
    } catch (error) {
      await handleFormSubmissionError(error, undefined, setAlert);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (deactivated) {
      toggleStatus();
    } else {
      setAlert({
        icon: "warning",
        title: "Deactivate this job?",
        message:
          "The job will be hidden from candidates. You can reactivate it later.",
        buttonText: "Deactivate",
        buttonAction: toggleStatus,
        buttonClassName: "btn-error",
      });
    }
  };

  return (
    <Button
      loading={loading}
      variant='link'
      className={`no-underline hover:no-underline ${deactivated ? "link-success" : "link-error"}`}
      onClick={handleClick}
    >
      {deactivated ? "Reactivate" : "Deactivate"}
    </Button>
  );
};

export default ApproveJob;
