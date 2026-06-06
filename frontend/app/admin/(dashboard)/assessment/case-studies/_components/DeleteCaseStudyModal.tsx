"use client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { ID } from "@/app/common/types";
import DeleteIcon from "@/app/common/icons/DeleteIcon";
import { useAlert } from "@/app/common/store/useAlert";
import { handleFormSubmissionError } from "@/app/common/utils";
import { deleteCaseStudyProject } from "@/app/common/services/case-study";

const DeleteCaseStudyModal = ({ id }: { id: ID }) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);

  const handleDelete = async () => {
    try {
      await deleteCaseStudyProject(id);
      toast.info("Case Study Project deleted successfully");
      router.refresh();
    } catch (error) {
      handleFormSubmissionError(error, undefined, setAlert);
    }
  };

  const onClick = () =>
    setAlert({
      title: "Are you sure?",
      message: "Do you you want to delete this Case Study Project?",
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

export default DeleteCaseStudyModal;
