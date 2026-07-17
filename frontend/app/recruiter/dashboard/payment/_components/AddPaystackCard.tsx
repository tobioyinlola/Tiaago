"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { LuPlus } from "react-icons/lu";
import { useRouter } from "next/navigation";
import { usePaystackPayment } from "react-paystack";

import { cn } from "@/app/common/utils";
import Modal from "@/app/common/components/Modal";
import { addPaystackPaymentMethod } from "@/app/common/services/subscription";

const AddPaystackCard = ({
  publickey,
  email,
  btnClassName,
  refresh = true,
  onSuccess,
}: {
  publickey: string;
  email: string;
  btnClassName?: string;
  refresh?: boolean;
  onSuccess?: () => void;
}) => {
  const modalRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  const closeModal = () => modalRef.current?.close();
  const openModal = () => modalRef.current?.showModal();
  const initializePayment = usePaystackPayment({
    email,
    amount: 5000,
    publicKey: publickey,
  });

  const onButtonClick = () => {
    initializePayment({
      onSuccess: data => {
        const reference = data.reference;
        toast.promise(addPaystackPaymentMethod(reference), {
          loading: "Adding card...",
          success: () => {
            if (refresh) router.refresh();
            onSuccess?.();
            return "Card added successfully";
          },
          error: "Failed to add card",
        });
      },
      onClose: () => {
        toast.info("Action cancelled");
      },
    });
    closeModal();
  };

  return (
    <>
      <button
        onClick={openModal}
        className={cn(
          "w-full cursor-pointer h-[174px] flex flex-col items-center justify-center gap-2 font-poppins rounded-xl text-[#FEFEFF] px-6 py-3.5 bg-[#EBECEE]",
          btnClassName
        )}
      >
        <div className='w-[28px] h-[28px] bg-[#88898A] rounded-full flex items-center justify-center'>
          <LuPlus className='text-xl text-white' />
        </div>
        <p className='text-center text-lg text-[#88898A]'>Add a card</p>
      </button>
      <Modal id='add-paystack-card-modal' modalRef={modalRef} autoHeight>
        <div className='w-[90svw] max-w-md'>
          <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold mb-2'>
            Add credit/debit card
          </h3>
          <p className='text-[#999] text-sm -tracking-[0.1px]'>
            All transactions are secure and encrypted
          </p>
          <div className='mt-6 border-t py-8' />
          <button onClick={onButtonClick} className='btn btn-primary w-full'>
            Add Card
          </button>
        </div>
      </Modal>
    </>
  );
};

export default AddPaystackCard;
