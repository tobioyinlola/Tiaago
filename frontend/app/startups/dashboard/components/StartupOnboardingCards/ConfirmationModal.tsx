import { PartyPopper, X, Users, DollarSign } from "lucide-react";

interface ConfirmationModalProps {
  userName: string;
  onClose: () => void;
  onUsageBased: () => void;
  onSubscription: () => void;
}

export default function ConfirmationModal({
  userName,
  onClose,
  onUsageBased,
  onSubscription,
}: ConfirmationModalProps) {
  return (
    <div className='bg-white'>
      {/* Close Button */}
      <button
        onClick={onClose}
        className='absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors'
      >
        <X size={20} />
      </button>

      {/* Success Animation */}
      <div className='text-center mb-6'>
        <div className='inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-full mb-4 animate-bounce'>
          <PartyPopper className='w-10 h-10 text-blue-600' />
        </div>
        <h2 className='text-xl sm:text-2xl font-bold text-gray-900 mb-2'>
          🎉 You&apos;re All Set, {userName}!
        </h2>
        <p className='text-gray-600 text-sm sm:text-base'>
          Welcome to TIAAGO! Your account is ready and you can start hiring top
          talent immediately.
        </p>
      </div>

      {/* Quick Stats */}
      <div className='grid grid-cols-2 gap-4 mb-6 sm:mb-8'>
        <div className='text-center p-4 bg-blue-50 rounded-lg border border-blue-100'>
          <div className='text-xl sm:text-2xl font-bold text-blue-600 mb-1'>
            2,000+
          </div>
          <div className='text-xs sm:text-sm text-gray-600'>
            Verified Talents
          </div>
        </div>
        <div className='text-center p-4 bg-blue-50 rounded-lg border border-blue-100'>
          <div className='text-xl sm:text-2xl font-bold text-blue-600 mb-1'>
            24h
          </div>
          <div className='text-xs sm:text-sm text-gray-600'>
            Avg. Time to Hire
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className='space-y-3 mb-6 sm:mb-8'>
        <h3 className='font-semibold text-gray-900'>Pick Your Pricing Plan</h3>
        <div className='space-y-2'>
          <div className='flex items-center space-x-3 text-sm'>
            <div className='w-2 h-2 bg-blue-500 rounded-full flex-shrink-0'></div>
            <span className='text-gray-600'>
              Usage-based: Pay only for what you use
            </span>
          </div>
          <div className='flex items-center space-x-3 text-sm'>
            <div className='w-2 h-2 bg-blue-500 rounded-full flex-shrink-0'></div>
            <span className='text-gray-600'>
              Subscription: Fixed monthly rate with volume discounts
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <button
          onClick={onUsageBased}
          className='w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 hover:shadow-lg transition-all duration-200 transform hover:scale-105'
        >
          <DollarSign size={20} />
          <span>Usage-Based</span>
        </button>
        <button
          onClick={onSubscription}
          className='w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors'
        >
          <Users size={20} />
          <span>Subscription</span>
        </button>
      </div>

      {/* Support Note */}
      <div className='mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
        <p className='text-xs sm:text-sm text-blue-700 text-center'>
          Need help getting started? Our support team is here to assist you at{" "}
          <a
            href='mailto:support@tiaago.com'
            className='font-medium hover:underline'
          >
            support@tiaago.com
          </a>
        </p>
      </div>
    </div>
  );
}
