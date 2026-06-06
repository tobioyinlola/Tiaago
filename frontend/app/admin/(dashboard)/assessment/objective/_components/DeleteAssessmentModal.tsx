"use client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import DeleteIcon from "@/app/common/icons/DeleteIcon";
import { deleteAssessment } from "@/app/common/services/assessment";
import { useAlert } from "@/app/common/store/useAlert";
import { handleFormSubmissionError } from "@/app/common/utils";

const DeleteAssessmentModal = ({ slug }: { slug: string }) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);

  const handleDelete = async () => {
    try {
      await deleteAssessment(slug);
      toast.info("Assessment deleted successfully");
      router.refresh();
    } catch (error) {
      handleFormSubmissionError(error, undefined, setAlert);
    }
  };

  const onClick = () =>
    setAlert({
      title: "Are you sure?",
      message: "Do you you want to delete this Assessment?",
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

export default DeleteAssessmentModal;
