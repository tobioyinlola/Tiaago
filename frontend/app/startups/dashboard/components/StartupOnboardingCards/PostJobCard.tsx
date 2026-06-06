import { Briefcase, MapPin, Clock, DollarSign } from "lucide-react";

import OnboardingCard from "./OnboardingCard";

interface PostJobCardProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

export default function PostJobCard({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}: PostJobCardProps) {
  return (
    <OnboardingCard
      title="📝 Let's Get Your First Role Live"
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onPrevious={onPrevious}
      onSkip={onSkip}
    >
      <div className='space-y-4'>
        <div className='text-center'>
          <div className='inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-full mb-3'>
            <Briefcase className='w-7 h-7 text-blue-600' />
          </div>
          <p className='text-sm text-gray-600 mb-4'>
            Create your first job posting to start attracting qualified
            candidates. Our AI will help match you with the best talent.
          </p>
        </div>

        <div className='bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-100'>
          <h4 className='font-semibold text-gray-900 mb-3 text-sm'>
            Job Posting Preview
          </h4>
          <div className='space-y-3'>
            <div>
              <label className='flex items-center text-xs font-medium text-gray-700 mb-1'>
                <Briefcase className='w-3 h-3 mr-1' />
                Job Title
              </label>
              <div className='w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm'>
                Senior React Developer
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div>
                <label className='flex items-center text-xs font-medium text-gray-700 mb-1'>
                  <MapPin className='w-3 h-3 mr-1' />
                  Location
                </label>
                <div className='w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm'>
                  Remote / San Francisco
                </div>
              </div>

              <div>
                <label className='flex items-center text-xs font-medium text-gray-700 mb-1'>
                  <Clock className='w-3 h-3 mr-1' />
                  Job Type
                </label>
                <div className='w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm'>
                  Full-time
                </div>
              </div>
            </div>

            <div>
              <label className='flex items-center text-xs font-medium text-gray-700 mb-1'>
                <DollarSign className='w-3 h-3 mr-1' />
                Salary Range
              </label>
              <div className='w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm'>
                $120,000 - $160,000
              </div>
            </div>

            <div>
              <label className='text-xs font-medium text-gray-700 mb-1 block'>
                Required Skills
              </label>
              <div className='flex flex-wrap gap-1'>
                {["React", "TypeScript", "Node.js", "GraphQL", "AWS"].map(
                  skill => (
                    <span
                      key={skill}
                      className='px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium'
                    >
                      {skill}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </OnboardingCard>
  );
}
