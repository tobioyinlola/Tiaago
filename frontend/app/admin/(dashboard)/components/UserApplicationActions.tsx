"use client";
import { toast } from "sonner";
import Button from "@/app/common/components/DaisyButton";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ID } from "@/app/common/types";
import Modal from "@/app/common/components/Modal";
import { useAlert } from "@/app/common/store/useAlert";
import WarningIcon from "@/app/common/icons/WarningIcon";
import { approveUser } from "@/app/common/services/profile";
import { cn, handleFormSubmissionError } from "@/app/common/utils";

const UserApplicationActions = ({
  id,
  isStartup,
}: {
  id: ID;
  isStartup?: boolean;
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"accept" | "decline">();
  const modalRef = useRef<HTMLDialogElement>(null);
  const setAlert = useAlert(state => state.setAlert);

  const accepted = action === "accept";
  const name = isStartup ? "startup" : "talent";

  const handleAction = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await approveUser(id, accepted);
      setLoading(false);
      toast.success(
        `You have ${
          accepted ? "accepted" : "declined"
        } this ${name}'s application`
      );
      modalRef.current?.close();
      router.refresh();
    } catch (error: any) {
      setLoading(false);
      handleFormSubmissionError(error, undefined, setAlert);
      modalRef.current?.close();
    }
  };

  const handleClick = (action: "accept" | "decline") => {
    setAction(action);
    modalRef.current?.showModal();
  };

  return (
    <div className='flex items-center gap-2'>
      <button
        type='button'
        className='inline-flex items-center rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        onClick={() => handleClick("decline")}
      >
        Decline
      </button>
      <button
        type='button'
        className='inline-flex items-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        onClick={() => handleClick("accept")}
      >
        Accept
      </button>

      <Modal
        modalRef={modalRef}
        autoHeight
        id={`talent-application-modal-${id}`}
        disableClose={loading}
      >
        <div className='p-1 w-[80svw] max-w-md'>
          <div className='flex flex-col items-center'>
            <WarningIcon className='mb-8' />
            <h3 className='text-[32px] leading-[38px] -tracking-[0.5px] font-bold mb-4'>
              Are you sure?
            </h3>
            <p className='text-muted-foreground text-sm'>
              {accepted
                ? `Do you want to approve this ${name} aboard Tiaago?`
                : `Do you want to decline this ${name}'s application?`}
            </p>
          </div>
          <div className='modal-action'>
            <Button
              loading={loading}
              className={cn(
                "btn btn-primary text-white w-full",
                !accepted && "btn-error"
              )}
              onClick={handleAction}
            >
              {loading ? "Submitting..." : accepted ? "Accept" : "Decline"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserApplicationActions;
