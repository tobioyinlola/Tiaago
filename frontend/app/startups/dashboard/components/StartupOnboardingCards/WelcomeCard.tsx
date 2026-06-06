import { Users, Sparkles } from 'lucide-react';

import OnboardingCard from './OnboardingCard';

interface WelcomeCardProps {
  userName: string;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}

export default function WelcomeCard({ userName, currentStep, totalSteps, onNext, onSkip }: WelcomeCardProps) {
  return (
    <OnboardingCard
      title={`👋 Welcome, ${userName}!`}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onSkip={onSkip}
    >
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-full mb-3">
            <Sparkles className="w-7 h-7 text-blue-600" />
          </div>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            Welcome to <span className="font-semibold text-blue-600">TIAAGO</span> – your OS for hiring that helps you screen, access and interview candidates in record time.
          </p>
        </div>

        {/* YouTube Demo Video */}
        <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-100">
          <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
            <iframe 
              width="100%" 
              height="100%" 
              src="https://www.youtube.com/embed/_QLWQnn2hSs?si=Z8KWTfv-NEKb5JM_" 
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
              className="rounded-lg"
            ></iframe>
          </div>
          <div className="mt-2 text-center">
            <p className="text-xs sm:text-sm text-blue-700 font-medium">
              See how TIAAGO transforms your hiring process in 60 seconds
            </p>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <Users className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">Pre-vetted Talent</h4>
              <p className="text-xs text-gray-600">Access thousands of qualified candidates</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">AI-Powered Matching</h4>
              <p className="text-xs text-gray-600">Coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </OnboardingCard>
  );
}