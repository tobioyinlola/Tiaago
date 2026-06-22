"use client";
import { toast } from "sonner";
import Button from "@/app/common/components/DaisyButton";
import { useRouter } from "next/navigation";

import { ID } from "@/app/common/types";
import Modal from "@/app/common/components/Modal";
import { useAlert } from "@/app/common/store/useAlert";
import DeleteIcon from "@/app/common/icons/DeleteIcon";
import { handleFormSubmissionError } from "@/app/common/utils";
import { deleteContract } from "@/app/common/services/contract";

const DeleteContractModal = ({ id }: { id: ID }) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);

  const handleDelete = async () => {
    try {
      await deleteContract(id);
      toast.success("Contract deleted successfully");
      router.refresh();
    } catch (error) {
      handleFormSubmissionError(error, undefined, setAlert);
    }
  };

  const onClick = () =>
    setAlert({
      title: "Are you sure?",
      message: "Do you you want to delete this Contract?",
      icon: "warning",
      buttonText: "Delete",
      buttonAction: handleDelete,
      buttonClassName: "btn-error text-white",
    });

  return (
    <button onClick={onClick}>
      <DeleteIcon className='fill-error w-5' />
    </button>
  );
};

export default DeleteContractModal;
