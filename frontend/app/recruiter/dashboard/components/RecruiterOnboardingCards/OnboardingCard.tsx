import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/app/common/utils";

interface OnboardingCardProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  onNext?: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
}

export default function OnboardingCard({
  children,
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  nextLabel = "Continue",
}: OnboardingCardProps) {
  return (
    <div className="flex flex-col min-h-[60svh] sm:min-h-0">
      {/* Dot stepper */}
      <div className="flex items-center justify-center gap-2 py-3">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all duration-300",
              i + 1 === currentStep && "w-6 h-2.5 bg-primary",
              i + 1 < currentStep && "w-2.5 h-2.5 bg-primary opacity-40",
              i + 1 > currentStep && "w-2.5 h-2.5 bg-muted",
            )}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 sm:px-4">
        {children}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 pb-1 border-t border-border mt-4">
        <button
          onClick={onPrevious}
          disabled={currentStep === 1}
          className={cn(
            "flex items-center gap-1 px-3 py-2.5 rounded-md text-sm font-medium transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            currentStep === 1
              ? "text-muted-foreground/40 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <ChevronLeft size={18} />
          Back
        </button>

        <div className="flex items-center gap-3">
          {onSkip && (
            <button
              onClick={onSkip}
              className="px-3 py-2.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
            >
              Skip
            </button>
          )}
          {onNext && (
            <button
              onClick={onNext}
              className="flex items-center gap-1 px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {nextLabel}
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
