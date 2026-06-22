"use client";

import { useState } from "react";
import Button from "@/app/common/components/DaisyButton";
import { initiateAssessmentPayment } from "@/app/common/services/assessment";

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentId: string;
  onSuccess: (paymentUrl?: string) => void;
}

export const CouponModal = ({
  isOpen,
  onClose,
  assessmentId,
  onSuccess,
}: CouponModalProps) => {
  const [couponCode, setCouponCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError("Please enter a coupon code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await initiateAssessmentPayment(
        assessmentId,
        couponCode
      );
      if (response.success && response.data) {
        onSuccess(response.data.payment_url);
      } else {
        setError(response.error || "Invalid or expired coupon code");
      }
    } catch (error) {
      console.error("Error applying coupon:", error);
      setError("Failed to apply coupon. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg p-6 w-full max-w-md'>
        <h2 className='text-xl font-semibold mb-4'>Apply Coupon</h2>

        <div className='space-y-4'>
          <div>
            <input
              type='text'
              value={couponCode}
              onChange={e => setCouponCode(e.target.value)}
              placeholder='Enter coupon code'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
              disabled={isLoading}
            />
            {error && <p className='text-red-500 text-sm mt-1'>{error}</p>}
          </div>

          <div className='flex justify-end gap-3'>
            <Button onClick={onClose} color='ghost' disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyCoupon}
              color='primary'
              loading={isLoading}
              disabled={!couponCode.trim() || isLoading}
            >
              Apply Coupon
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CouponModal;
