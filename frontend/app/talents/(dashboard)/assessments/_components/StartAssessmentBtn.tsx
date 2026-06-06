"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAlert } from "@/app/common/store/useAlert";
import { CouponModal } from "@/app/common/components/CouponModal";

const StartAssessmentBtn = ({
  href,
  checkoutUrl,
  children,
  assessmentId,
  daysLeftToTakeAssessment,
}: {
  href: string;
  checkoutUrl?: string;
  children: React.ReactNode;
  assessmentId: string;
  daysLeftToTakeAssessment?: number;
}) => {
  const router = useRouter();
  const setAlert = useAlert(state => state.setAlert);
  const [showCouponModal, setShowCouponModal] = useState(false);

  const handleCouponSuccess = (paymentUrl?: string) => {
    if (paymentUrl) {
      window.location.href = paymentUrl;
    } else {
      toast.success("Assessment unlocked successfully");
      router.push(href);
    }
  };

  const handlePaymentClick = async () => {
    if (daysLeftToTakeAssessment) {
      setAlert({
        title: "Assessment Cooldown",
        message: `You can take this assessment in ${daysLeftToTakeAssessment} days.`,
        icon: "info",
        buttonText: "OK",
        buttonClassName: "btn-primary text-white",
      });
      return;
    }

    if (!checkoutUrl) {
      router.push(href);
      return;
    }

    // For direct payment without coupon
    const handleDirectPayment = () => {
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    };

    setAlert({
      title: "Payment Required",
      message: "You need to make a payment to access this assessment.",
      icon: "info",
      buttonText: "Make Payment",
      buttonAction: handleDirectPayment,
      buttonClassName: "btn-primary text-white",
      secondaryButton: {
        text: "Use Coupon",
        action: () => setShowCouponModal(true),
      },
    });
  };

  return (
    <>
      <button
        className='btn btn-primary px-8 py-3 w-full sm:max-w-[253px] font-medium'
        onClick={handlePaymentClick}
      >
        {children}
      </button>

      <CouponModal
        isOpen={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        assessmentId={assessmentId}
        onSuccess={handleCouponSuccess}
      />
    </>
  );
};

export default StartAssessmentBtn;
