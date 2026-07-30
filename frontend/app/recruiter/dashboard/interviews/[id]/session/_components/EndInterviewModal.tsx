"use client";

const EndInterviewModal = ({
  open,
  ending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  ending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  if (!open) return null;

  return (
    <div className='fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4'>
      <div className='bg-white rounded-2lg p-6 max-w-sm w-full'>
        <p className='font-semibold text-primaryBlack text-lg'>End this interview?</p>
        <p className='text-sm text-secondary-black mt-2'>
          This will stop the recording and generate your interview summary.
        </p>
        <div className='flex items-center justify-end gap-2 mt-6'>
          <button
            type='button'
            onClick={onCancel}
            disabled={ending}
            className='btn btn-ghost btn-sm rounded-lg'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={onConfirm}
            disabled={ending}
            className='btn btn-sm rounded-lg !bg-red-600 !text-white border-none hover:!bg-red-700'
          >
            {ending ? "Ending..." : "End Interview"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndInterviewModal;
