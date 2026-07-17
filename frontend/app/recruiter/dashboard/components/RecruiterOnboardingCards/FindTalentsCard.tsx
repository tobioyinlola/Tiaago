import Image from "next/image";

import OnboardingCard from "./OnboardingCard";

interface FindTalentsCardProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

export default function FindTalentsCard({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}: FindTalentsCardProps) {
  return (
    <OnboardingCard
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onPrevious={onPrevious}
      onSkip={onSkip}
    >
      <div className="w-full space-y-4 sm:space-y-6">
        {/* Illustration */}
        <div className="flex justify-center">
          <Image
            src="/assets/illustrations/onboarding/find-talents.svg"
            alt="Find talents illustration"
            width={320}
            height={240}
            className="w-full max-w-xs sm:max-w-sm h-auto"
            priority
          />
        </div>

        {/* Copy */}
        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Discover Pre-Vetted Talent
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            Browse candidates already assessed and ranked for your stack.
          </p>
        </div>
      </div>
    </OnboardingCard>
  );
}
