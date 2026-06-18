import Image from "next/image";

import OnboardingCard from "./OnboardingCard";

interface PaymentCardProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

export default function PaymentCard({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}: PaymentCardProps) {
  return (
    <OnboardingCard
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onPrevious={onPrevious}
      onSkip={onSkip}
      nextLabel="Finish Tour"
    >
      <div className="w-full space-y-4 sm:space-y-6">
        {/* Illustration */}
        <div className="flex justify-center">
          <Image
            src="/assets/illustrations/onboarding/payment.svg"
            alt="Secure payment illustration"
            width={320}
            height={240}
            className="w-full max-w-xs sm:max-w-sm h-auto"
            priority
          />
        </div>

        {/* Copy */}
        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Pay As You Go
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            No subscriptions needed. Only pay when you screen or assess
            candidates.
          </p>
        </div>
      </div>
    </OnboardingCard>
  );
}
