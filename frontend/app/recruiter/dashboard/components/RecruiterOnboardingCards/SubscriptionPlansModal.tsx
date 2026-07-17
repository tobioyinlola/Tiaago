import { subscriptionPlans } from "@/app/(home)/pricing/constants";
import { X, Check, Star, Building2, Zap } from "lucide-react";

interface SubscriptionPlansModalProps {
  onClose: () => void;
  onSelectPlan: (planName: string) => void;
}

export default function SubscriptionPlansModal({
  onClose,
  onSelectPlan,
}: SubscriptionPlansModalProps) {
  const buttonStyles = [
    "bg-gray-100 text-gray-700 hover:bg-gray-200",
    "bg-blue-500 text-white hover:bg-blue-600",
    "bg-blue-500 text-white hover:bg-blue-600",
  ];

  const icons = [
    <Zap key='zap' className='w-6 h-6 text-gray-600' />,
    <Star key='star' className='w-6 h-6 text-blue-600' />,
    <Building2 key='building' className='w-6 h-6 text-blue-600' />,
  ];

  return (
    <div className='bg-white'>
      {/* Close Button */}
      <button
        onClick={onClose}
        className='absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10'
      >
        <X size={20} />
      </button>

      {/* Header */}
      <div className='text-center p-6 sm:p-8 pb-4'>
        <h2 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-2'>
          Choose Your Subscription Plan
        </h2>
        <p className='text-gray-600'>
          Select the plan that best fits your hiring needs
        </p>
      </div>

      {/* Plans Grid */}
      <div className='px-6 sm:px-8 pb-6 sm:pb-8'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {subscriptionPlans.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative bg-white border-2 rounded-xl p-6 transition-all duration-200 hover:shadow-lg ${
                plan.popular
                  ? "border-blue-500 shadow-lg"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className='absolute -top-3 left-1/2 transform -translate-x-1/2'>
                  <span className='bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium'>
                    Recommended
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className='text-center mb-6'>
                <div className='inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-full mb-3'>
                  {icons[i]}
                </div>
                <h3 className='text-xl font-bold text-gray-900 mb-1'>
                  {plan.name}
                </h3>
                <p className='text-gray-600 text-sm mb-3'>{plan.description}</p>
                <div className='flex items-baseline justify-center'>
                  <span className='text-3xl font-bold text-gray-900'>
                    {plan.price.monthly}
                  </span>
                  <span className='text-gray-600 ml-1'>/month</span>
                </div>
              </div>

              {/* Features */}
              <div className='space-y-3 mb-6'>
                {plan.features.map((feature, index) => (
                  <div key={index} className='flex items-start space-x-3'>
                    <Check className='w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0' />
                    <span className='text-gray-700 text-sm'>{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => onSelectPlan(plan.name)}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${buttonStyles[i]}`}
                disabled
              >
                {/* {plan.buttonText} */}
                Coming Soon
              </button>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className='mt-8 text-center'>
          <p className='text-sm text-gray-600'>
            All plans include secure payment processing and can be cancelled
            anytime.{" "}
            <a href='#' className='text-blue-600 hover:underline font-medium'>
              View detailed comparison
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
