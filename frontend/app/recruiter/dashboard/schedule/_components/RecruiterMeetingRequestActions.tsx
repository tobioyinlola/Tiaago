"use client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { ID } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { handleFormSubmissionError } from "@/app/common/utils";
import { deleteMeeting } from "@/app/common/services/schedule";

const RecruiterMeetingRequestActions = ({ id }: { id: ID }) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);

  const handleClick = async () => {
    try {
      const res = await deleteMeeting(id);
      console.log("res:", res);
      toast.success("You have deleted meeting request");
      router.refresh();
    } catch (error: any) {
      console.log("error:", error?.message);
      console.log("keys:", Object.keys(error));
      // handle error from action
      handleFormSubmissionError(error, undefined);
    }
  };

  const showAlert = () => {
    setAlert({
      title: "Are you sure?",
      message: "Do you you want to delete this meeting request?",
      buttonText: "Delete",
      icon: "warning",
      buttonAction: handleClick,
      buttonClassName: "btn-error text-white",
    });
  };

  return (
    <button className='btn btn-sm btn-error' onClick={showAlert}>
      Delete
    </button>
  );
};

export default RecruiterMeetingRequestActions;
