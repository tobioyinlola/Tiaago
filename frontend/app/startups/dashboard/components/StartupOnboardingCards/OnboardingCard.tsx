import React from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface OnboardingCardProps {
  title: string;
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  onNext?: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  hideNavigation?: boolean;
}

export default function OnboardingCard({
  title,
  children,
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  nextLabel = "Next",
  hideNavigation = false,
}: OnboardingCardProps) {
  return (
    <div className='bg-white'>
      {/* Skip Button */}
      {/* {onSkip && (
        <button
          onClick={onSkip}
          className='absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10'
        >
          <X size={20} />
        </button>
      )} */}

      {/* Progress Indicator */}
      <div className='mb-4 sm:mb-6'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-sm font-medium text-gray-500'>
            Step {currentStep} of {totalSteps}
          </span>
        </div>
        <div className='w-full bg-gray-200 rounded-full h-2'>
          <div
            className='bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out'
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Title */}
      <h2 className='text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight pr-8'>
        {title}
      </h2>

      {/* Content */}
      <div className='mb-4 sm:mb-6'>{children}</div>

      {/* Navigation */}
      {!hideNavigation && (
        <div className='flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 pt-2 border-t border-gray-100'>
          <button
            onClick={onPrevious}
            disabled={currentStep === 1}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors order-2 sm:order-1 ${
              currentStep === 1
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            <ChevronLeft size={20} className='mr-1' />
            Previous
          </button>

          <div className='flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 order-1 sm:order-2 pr-1 pb-1'>
            {onSkip && (
              <button
                onClick={onSkip}
                className='px-4 py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors text-sm'
              >
                Skip Tour
              </button>
            )}
            {onNext && (
              <button
                onClick={onNext}
                className='flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 hover:shadow-lg transition-all duration-200 transform hover:scale-105'
              >
                {nextLabel}
                <ChevronRight size={20} className='ml-1' />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
