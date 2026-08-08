"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineTrash } from "react-icons/hi";

import { ID } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";
import { deleteStaffQuestionBankEntry } from "@/app/common/services/assessment";

const DeleteQuestionButton = ({ id }: { id: ID }) => {
  const router = useRouter();
  const setAlert = useAlert(s => s.setAlert);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    setAlert({
      title: "Delete this question?",
      message: "It will no longer be selectable for bundles or assessments. This can't be undone.",
      icon: "warning",
      buttonText: "Delete",
      buttonClassName: "btn-error text-white",
      buttonAction: async () => {
        setDeleting(true);
        const res = await deleteStaffQuestionBankEntry(id);
        setDeleting(false);
        if (!res.success) {
          setAlert({ title: "Error", message: res.error, icon: "error" });
          return;
        }
        router.refresh();
      },
    });
  };

  return (
    <button
      type="button"
      className="btn btn-ghost min-h-fit h-fit px-1"
      disabled={deleting}
      onClick={handleDelete}
    >
      <HiOutlineTrash className="text-[#FF4A4A]" />
    </button>
  );
};

export default DeleteQuestionButton;
