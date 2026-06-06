import {
  Brain,
  BarChart3,
  FileText,
  MessageSquare,
  TrendingUp,
} from "lucide-react";

import OnboardingCard from "./OnboardingCard";

interface AIFeedbackCardProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

export default function AIFeedbackCard({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}: AIFeedbackCardProps) {
  const mockScores = {
    resume: 87,
    technical: 92,
    communication: 85,
    overall: 88,
  };

  return (
    <OnboardingCard
      title='📊 Make Smarter Hiring Decisions'
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onPrevious={onPrevious}
      onSkip={onSkip}
    >
      <div className='space-y-4'>
        <div className='text-center'>
          <div className='inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-full mb-3'>
            <Brain className='w-7 h-7 text-blue-600' />
          </div>
          <p className='text-sm text-gray-600 mb-4'>
            Our AI analyzes resumes, technical assessments, and interviews to
            provide comprehensive candidate insights and scoring.
          </p>
        </div>

        {/* AI Dashboard Preview */}
        <div className='bg-blue-50 rounded-xl p-3 border border-blue-100'>
          <h4 className='font-semibold text-gray-900 mb-3 flex items-center text-sm'>
            <BarChart3 className='w-4 h-4 mr-2 text-blue-600' />
            AI-Powered Candidate Dashboard
          </h4>

          <div className='grid grid-cols-1 gap-4'>
            {/* Candidate Scores */}
            <div className='space-y-3'>
              <h5 className='text-xs font-medium text-gray-700'>
                Candidate Scores
              </h5>
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center'>
                    <FileText className='w-3 h-3 text-blue-500 mr-2' />
                    <span className='text-xs text-gray-600'>Resume Match</span>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <div className='w-16 h-1.5 bg-gray-200 rounded-full'>
                      <div
                        className='h-1.5 bg-blue-500 rounded-full'
                        style={{ width: `${mockScores.resume}%` }}
                      />
                    </div>
                    <span className='text-xs font-medium text-gray-900'>
                      {mockScores.resume}%
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-between'>
                  <div className='flex items-center'>
                    <Brain className='w-3 h-3 text-blue-600 mr-2' />
                    <span className='text-xs text-gray-600'>
                      Technical Skills
                    </span>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <div className='w-16 h-1.5 bg-gray-200 rounded-full'>
                      <div
                        className='h-1.5 bg-blue-600 rounded-full'
                        style={{ width: `${mockScores.technical}%` }}
                      />
                    </div>
                    <span className='text-xs font-medium text-gray-900'>
                      {mockScores.technical}%
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-between'>
                  <div className='flex items-center'>
                    <MessageSquare className='w-3 h-3 text-blue-500 mr-2' />
                    <span className='text-xs text-gray-600'>Communication</span>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <div className='w-16 h-1.5 bg-gray-200 rounded-full'>
                      <div
                        className='h-1.5 bg-blue-500 rounded-full'
                        style={{ width: `${mockScores.communication}%` }}
                      />
                    </div>
                    <span className='text-xs font-medium text-gray-900'>
                      {mockScores.communication}%
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-between pt-2 border-t border-gray-200'>
                  <div className='flex items-center'>
                    <TrendingUp className='w-3 h-3 text-blue-600 mr-2' />
                    <span className='text-xs font-medium text-gray-700'>
                      Overall Score
                    </span>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <div className='w-16 h-1.5 bg-gray-200 rounded-full'>
                      <div
                        className='h-1.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full'
                        style={{ width: `${mockScores.overall}%` }}
                      />
                    </div>
                    <span className='text-xs font-bold text-gray-900'>
                      {mockScores.overall}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className='space-y-2'>
              <h5 className='text-xs font-medium text-gray-700'>AI Insights</h5>
              <div className='space-y-2'>
                <div className='bg-green-50 border border-green-200 rounded-lg p-2'>
                  <div className='flex items-start space-x-2'>
                    <div className='text-green-600 mt-0.5 text-xs'>✅</div>
                    <div>
                      <p className='text-xs font-medium text-green-900'>
                        Strong Technical Fit
                      </p>
                      <p className='text-xs text-green-700'>
                        Exceeds requirements in React, TypeScript
                      </p>
                    </div>
                  </div>
                </div>

                <div className='bg-blue-50 border border-blue-200 rounded-lg p-2'>
                  <div className='flex items-start space-x-2'>
                    <div className='text-blue-600 mt-0.5 text-xs'>💡</div>
                    <div>
                      <p className='text-xs font-medium text-blue-900'>
                        Interview Readiness
                      </p>
                      <p className='text-xs text-blue-700'>
                        Prepared for technical interviews
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className='grid grid-cols-3 gap-2'>
          <div className='text-center p-2 bg-gray-50 rounded-lg'>
            <FileText className='w-4 h-4 text-blue-600 mx-auto mb-1' />
            <h5 className='font-medium text-gray-900 text-xs'>
              Resume Analysis
            </h5>
            <p className='text-xs text-gray-600 mt-0.5'>
              AI-powered skill extraction
            </p>
          </div>
          <div className='text-center p-2 bg-gray-50 rounded-lg'>
            <Brain className='w-4 h-4 text-blue-600 mx-auto mb-1' />
            <h5 className='font-medium text-gray-900 text-xs'>
              Technical Assessment
            </h5>
            <p className='text-xs text-gray-600 mt-0.5'>
              Automated evaluations
            </p>
          </div>
          <div className='text-center p-2 bg-gray-50 rounded-lg'>
            <MessageSquare className='w-4 h-4 text-blue-600 mx-auto mb-1' />
            <h5 className='font-medium text-gray-900 text-xs'>
              Interview Insights
            </h5>
            <p className='text-xs text-gray-600 mt-0.5'>Pre-screen summaries</p>
          </div>
        </div>

        <div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
          <div className='flex items-start space-x-2'>
            <div className='text-blue-600 mt-0.5'>🚀</div>
            <div>
              <h5 className='font-medium text-blue-900 text-sm'>
                Save 70% of Your Screening Time
              </h5>
              <p className='text-xs text-blue-700'>
                Our AI does the heavy lifting, so you can focus on the
                candidates that matter most.
              </p>
            </div>
          </div>
        </div>
      </div>
    </OnboardingCard>
  );
}
