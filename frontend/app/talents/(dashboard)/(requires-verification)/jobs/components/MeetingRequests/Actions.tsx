"use client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { ID } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { handleFormSubmissionError } from "@/app/common/utils";
import { acceptMeeting } from "@/app/common/services/schedule";

const Actions = ({ id }: { id: ID }) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);

  const handleClick = async (accepted: boolean) => {
    try {
      const res = await acceptMeeting(id, accepted);
      console.log("res:", res);
      toast.success(
        `You have ${accepted ? "accepted" : "declined"} the meeting request`
      );
      router.refresh();
    } catch (error: any) {
      console.log("error:", error?.message);
      console.log("keys:", Object.keys(error));
      // handle error from action
      handleFormSubmissionError(error, undefined);
    }
  };

  const showAlert = (accepted: boolean) => {
    setAlert({
      title: "Are you sure?",
      message: `Do you you want to ${
        accepted ? "accept" : "decline"
      } this meeting request?`,
      buttonText: accepted ? "Accept" : "Decline",
      icon: "warning",
      buttonAction: () => handleClick(accepted),
      buttonClassName: accepted ? "" : "btn-error text-white",
    });
  };

  return (
    <div className='flex items-center gap-2'>
      <button
        className='btn btn-sm btn-primary'
        onClick={() => showAlert(true)}
      >
        Accept
      </button>
      <button className='btn btn-sm btn-error' onClick={() => showAlert(false)}>
        Decline
      </button>
    </div>
  );
};

export default Actions;
