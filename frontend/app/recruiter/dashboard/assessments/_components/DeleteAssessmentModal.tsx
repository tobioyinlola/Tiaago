"use client";

import { AlertTriangle } from "lucide-react";

import Modal from "@/app/common/components/Modal";
import Button from "@/app/common/components/DaisyButton";

const DeleteAssessmentModal = ({
  modalId,
  modalRef,
  title,
  deleting,
  onConfirm,
}: {
  modalId: string;
  modalRef: React.RefObject<HTMLDialogElement>;
  title: string;
  deleting: boolean;
  onConfirm: () => void;
}) => {
  return (
    <Modal id={modalId} modalRef={modalRef} autoHeight disableClose={deleting}>
      <div>
        <div className='mx-auto w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-4'>
          <AlertTriangle className='w-6 h-6 text-error' />
        </div>
        <h3 className='text-xl font-semibold text-primaryBlack mb-1 text-center font-space-grotesk'>
          Delete this assessment?
        </h3>
        <p className='text-secondary-black text-sm text-center'>
          &quot;{title}&quot; will be permanently deleted. This can&apos;t be undone.
        </p>

        <div className='mt-6 flex gap-3'>
          <Button
            type='button'
            color='primary'
            variant='outline'
            className='flex-1'
            disabled={deleting}
            onClick={() => modalRef.current?.close()}
          >
            Cancel
          </Button>
          <Button
            type='button'
            color='error'
            className='flex-1 text-white'
            loading={deleting}
            onClick={onConfirm}
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteAssessmentModal;
