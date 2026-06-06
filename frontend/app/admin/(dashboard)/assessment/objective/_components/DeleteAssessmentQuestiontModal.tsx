"use client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { ID } from "@/app/common/types";
import DeleteIcon from "@/app/common/icons/DeleteIcon";
import { useAlert } from "@/app/common/store/useAlert";
import { handleFormSubmissionError } from "@/app/common/utils";
import { deleteAssessmentQuestion } from "@/app/common/services/assessment";

const DeleteAssessmentQuestiontModal = ({
  slug,
  id,
}: {
  slug: string;
  id: ID;
}) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);

  const handleDelete = async () => {
    try {
      await deleteAssessmentQuestion(slug, id);
      toast.success("Question deleted successfully");
      router.refresh();
    } catch (error) {
      handleFormSubmissionError(error, undefined, setAlert);
    }
  };

  const onClick = () =>
    setAlert({
      title: "Are you sure?",
      message: "Do you you want to delete this Question?",
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

export default DeleteAssessmentQuestiontModal;
