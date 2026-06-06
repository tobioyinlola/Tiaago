"use client";

import { useState } from "react";
import { Button } from "react-daisyui";
import { toast } from "sonner";
import { initiateAssessmentPayment } from "@/app/common/services/assessment";

interface CouponInputProps {
  assessmentId: string;
  onApply: (paymentUrl: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const CouponInput = ({
  assessmentId,
  onApply,
  loading,
  setLoading,
}: CouponInputProps) => {
  const [couponCode, setCouponCode] = useState("");
  const [isApplied, setIsApplied] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    setLoading(true);
    try {
      const response = await initiateAssessmentPayment(
        assessmentId,
        couponCode
      );
      if (response.success && response.data?.payment_url) {
        onApply(response.data.payment_url);
        setIsApplied(true);
        toast.success("Coupon applied successfully!");
      } else {
        toast.error(response.error || "Invalid or expired coupon code");
      }
    } catch (error) {
      console.error("Error applying coupon:", error);
      toast.error("Failed to apply coupon. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isApplied) {
    return (
      <div className='mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-center'>
        Coupon applied successfully!
      </div>
    );
  }

  return (
    <div className='mt-4 flex flex-col sm:flex-row gap-2'>
      <input
        type='text'
        value={couponCode}
        onChange={e => setCouponCode(e.target.value)}
        placeholder='Enter coupon code'
        className='flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
        disabled={loading}
      />
      <Button
        color='primary'
        onClick={handleApplyCoupon}
        loading={loading}
        disabled={!couponCode.trim() || loading}
        className='whitespace-nowrap'
      >
        Apply Coupon
      </Button>
    </div>
  );
};

export default CouponInput;
