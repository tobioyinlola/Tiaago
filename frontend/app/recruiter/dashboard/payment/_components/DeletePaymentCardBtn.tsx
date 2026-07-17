"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { ID } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { handleFormSubmissionError } from "@/app/common/utils";
import { deletePaymentMethod } from "@/app/common/services/subscription";

const DeletePaymentCardBtn = ({ id }: { id: ID }) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);

  const handleDelete = async () => {
    try {
      const res = await deletePaymentMethod(id);
      if (res.success) {
        toast.success("Card deleted successfully");
        router.refresh();
      } else {
        throw new Error(res.error);
      }
    } catch (error) {
      setTimeout(() => {
        handleFormSubmissionError(error, undefined, setAlert);
      }, 10);
    }
  };

  const onClick = () =>
    setAlert({
      title: "Are you sure?",
      message: "Do you want to delete this card?",
      icon: "warning",
      buttonText: "Delete",
      buttonAction: handleDelete,
      buttonClassName: "btn-error text-white",
    });
  return (
    <button
      className='absolute -top-4 -right-4 btn btn-sm btn-circle btn-error text-base z-[2]'
      onClick={onClick}
    >
      ✕
    </button>
  );
};

export default DeletePaymentCardBtn;
