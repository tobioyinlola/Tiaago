"use client";

import { toast } from "sonner";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteCoupon } from "@/app/common/services/payments";

import { ID } from "@/app/common/types";
import { useAlert } from "@/app/common/store/useAlert";

interface DeleteCouponButtonProps {
  couponId: ID;
  refresh?: boolean;
}

export const DeleteCouponButton = ({
  couponId,
  refresh,
}: DeleteCouponButtonProps) => {
  const router = useRouter();
  const setAlert = useAlert(s => s.setAlert);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteCoupon(couponId);
      toast.success("Coupon deleted successfully");
      refresh && router.refresh();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast.error("Failed to delete coupon. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    setAlert({
      title: "Delete Coupon",
      message: "Are you sure you want to delete this coupon?",
      icon: "warning",
      buttonText: "Delete",
      buttonClassName: "btn btn-error",
      buttonAction: handleDelete,
    });
  };

  return (
    <button
      onClick={confirmDelete}
      disabled={isDeleting}
      className='disabled:opacity-50 disabled:cursor-not-allowed'
    >
      <Trash2 className='w-4 h-4 text-error' />
    </button>
  );
};

export default DeleteCouponButton;
