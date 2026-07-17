"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { ID } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { handleFormSubmissionError } from "@/app/common/utils";
import { setDefaultPaymentMethod } from "@/app/common/services/subscription";

const SetDeafaultPaymentCard = ({ id }: { id: ID }) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);

  const handleSetDefault = async () => {
    try {
      const res = await setDefaultPaymentMethod(id);
      if (res.success) {
        toast.success("Card set as default successfully");
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
      message: "Do you want to set this card as default?",
      icon: "warning",
      buttonText: "Set Default",
      buttonAction: handleSetDefault,
      buttonClassName: "btn-primary text-white",
    });
  return (
    <button
      className='text-primary font-medium hover:underline text-sm'
      onClick={onClick}
    >
      Set card as default
    </button>
  );
};

export default SetDeafaultPaymentCard;
