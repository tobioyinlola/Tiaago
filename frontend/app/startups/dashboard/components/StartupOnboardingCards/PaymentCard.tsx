import { CreditCard, Shield, Zap, DollarSign, Check } from "lucide-react";

import OnboardingCard from "./OnboardingCard";

interface PaymentCardProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

export default function PaymentCard({ currentStep, totalSteps, onNext, onPrevious, onSkip }: PaymentCardProps) {
  return (
    <OnboardingCard
      title="💳 Unlock Full Access with Billing Setup"
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onPrevious={onPrevious}
      onSkip={onSkip}
      nextLabel="Finish Tour"
    >
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-full mb-3">
            <CreditCard className="w-7 h-7 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Add a payment method to unlock full platform access. We use Stripe and Paystack for secure, encrypted payment processing.
          </p>
        </div>

        {/* Pricing Overview */}
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
            <DollarSign className="w-4 h-4 mr-2 text-blue-600" />
            Usage-Based Pricing
          </h4>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white rounded-lg p-2 border border-blue-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">Resume Screening</span>
                <span className="text-sm font-bold text-blue-600">$0.048</span>
              </div>
              <p className="text-xs text-gray-600">Per candidate</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-blue-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">Technical Assessment</span>
                <span className="text-sm font-bold text-blue-600">$0.60</span>
              </div>
              <p className="text-xs text-gray-600">Per candidate</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-blue-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">Non-Technical Assessment</span>
                <span className="text-sm font-bold text-blue-600">$0.40</span>
              </div>
              <p className="text-xs text-gray-600">Per candidate</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-blue-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">Pre-screening Interview</span>
                <span className="text-sm font-bold text-blue-600">$0.90</span>
              </div>
              <p className="text-xs text-gray-600">Per candidate</p>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 border border-blue-200">
            <div className="flex items-center text-xs text-gray-600">
              <Check className="w-3 h-3 text-blue-500 mr-2 flex-shrink-0" />
              <span>No monthly fees • Pay only for what you use • Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Payment Method Preview */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 text-sm">Payment Method Setup</h4>
          <div className="space-y-2">
            <div className="bg-white border-2 border-blue-200 rounded-lg p-2">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <div className="flex-1">
                  <span className="font-medium text-gray-900 text-sm">Stripe</span>
                  <p className="text-xs text-gray-600">Credit/Debit Cards, Bank Transfers</p>
                </div>
                <div className="text-blue-600">
                  <Check className="w-4 h-4" />
                </div>
              </div>
            </div>
            <div className="bg-white border-2 border-blue-200 rounded-lg p-2">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <div className="flex-1">
                  <span className="font-medium text-gray-900 text-sm">Paystack</span>
                  <p className="text-xs text-gray-600">Local Payment Methods</p>
                </div>
                <div className="text-blue-600">
                  <Check className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Features */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-start space-x-2 p-2 bg-gray-50 rounded-lg">
            <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="font-medium text-gray-900 text-xs">Bank-level Security</h5>
              <p className="text-xs text-gray-600">Encrypted payment processing</p>
            </div>
          </div>
          <div className="flex items-start space-x-2 p-2 bg-gray-50 rounded-lg">
            <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="font-medium text-gray-900 text-xs">Instant Activation</h5>
              <p className="text-xs text-gray-600">Start hiring immediately</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <div className="text-blue-600 mt-0.5">🔒</div>
            <div>
              <h5 className="font-medium text-blue-900 text-sm">Secure & Transparent</h5>
              <p className="text-xs text-blue-700">
                Your payment information is encrypted and processed securely. You&apos;ll only be charged when you actively use our services.
              </p>
            </div>
          </div>
        </div>
      </div>
    </OnboardingCard>
  );
}