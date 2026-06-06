"use client";
import { Button } from "react-daisyui";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ID } from "@/app/common/types";
import Modal from "@/app/common/components/Modal";
import { useAlert } from "@/app/common/store/useAlert";
import { handleFormSubmissionError } from "@/app/common/utils";
import { approveCaseStudyAttempt } from "@/app/common/services/case-study";

const ApprovalActions = ({
  id,
  projectId,
  talentId,
  talentName,
}: {
  id: ID;
  projectId: ID;
  talentId: ID;
  talentName: string;
}) => {
  const router = useRouter();
  const modalRef = useRef<HTMLDialogElement>(null);
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [loadingDecline, setLoadingDecline] = useState(false);
  const [remark, setRemark] = useState("");
  const setAlert = useAlert(state => state.setAlert);

  const handleClick = async (approved: boolean) => {
    if (loadingApprove || loadingDecline) return;
    const setLoading = approved ? setLoadingApprove : setLoadingDecline;
    try {
      setLoading(true);
      await approveCaseStudyAttempt(id, projectId, talentId, approved, remark);
      setAlert({
        title: approved ? "Success" : "Declined",
        message: `${talentName} has been ${
          approved ? "approved" : "declined"
        } as a Pro user on Tiaago`,
        icon: approved ? "success" : "info",
      });
      setLoading(false);
      router.refresh();
    } catch (error: any) {
      setLoading(false);
      handleFormSubmissionError(error, undefined, setAlert);
    }
  };

  return (
    <div className='flex items-center gap-2'>
      <button
        className='btn btn-primary btn-link no-underline'
        onClick={() => modalRef.current?.showModal()}
      >
        Rate
      </button>

      <Modal
        modalRef={modalRef}
        autoHeight
        id={`decline-meeting-modal-${id}`}
        disableClose={loadingApprove || loadingDecline}
      >
        <div className='p-1 w-[80svw] max-w-md'>
          <h3 className='text-[32px] leading-[38px] -tracking-[0.5px] font-bold mb-4'>
            Rate Case Study Project
          </h3>
          <p className='text-[#999] text-sm -tracking-[0.1px]'>
            Kindly rate this case study project
          </p>
          <textarea
            className='mt-4 textarea textarea-bordered w-full'
            placeholder='Remark'
            value={remark}
            onChange={e => setRemark(e.target.value)}
          />
          <div className='modal-action'>
            <Button
              disabled={loadingApprove}
              loading={loadingDecline}
              className='btn btn-error text-white flex-1'
              onClick={() => handleClick(false)}
            >
              {loadingDecline ? "Declining..." : "Decline"}
            </Button>
            <Button
              disabled={loadingDecline}
              loading={loadingApprove}
              className='btn btn-primary flex-1'
              onClick={() => handleClick(true)}
            >
              {loadingApprove ? "Approving..." : "Approve"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ApprovalActions;
