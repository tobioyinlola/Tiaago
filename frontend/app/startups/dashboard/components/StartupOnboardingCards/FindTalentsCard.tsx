import { useState } from 'react';
import { Search, Filter, Star, MapPin, Clock, CheckCircle } from 'lucide-react';

import OnboardingCard from './OnboardingCard';

interface FindTalentsCardProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

export default function FindTalentsCard({ currentStep, totalSteps, onNext, onPrevious, onSkip }: FindTalentsCardProps) {
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['React', 'TypeScript']);

  const skills = ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker'];
  const mockCandidates = [
    {
      id: 1,
      name: 'Sarah Chen',
      title: 'Senior Full Stack Developer',
      location: 'San Francisco, CA',
      availability: 'Available now',
      rating: 4.9,
      skills: ['React', 'TypeScript', 'Node.js'],
      verified: true
    },
    {
      id: 2,
      name: 'Marcus Johnson',
      title: 'DevOps Engineer',
      location: 'Remote',
      availability: '2 weeks notice',
      rating: 4.8,
      skills: ['AWS', 'Docker', 'Python'],
      verified: true
    }
  ];

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  return (
    <OnboardingCard
      title="🔍 Discover Top-Quality Candidates Instantly"
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onPrevious={onPrevious}
      onSkip={onSkip}
    >
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-full mb-3">
            <Search className="w-7 h-7 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Browse our pool of pre-vetted, verified talent. Use filters to find candidates that match your specific requirements.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
          <div className="flex flex-col space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by skills, experience..."
                value="React TypeScript Senior"
                readOnly
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Filter className="w-3 h-3 text-gray-600" />
                <span className="text-xs font-medium text-gray-700">Filter by skills:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {skills.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedSkills.includes(skill)
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mock Candidate Results */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 text-sm">Sample Candidates</h4>
          {mockCandidates.map((candidate) => (
            <div key={candidate.id} className="bg-white border border-gray-200 rounded-xl p-3 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row items-start justify-between space-y-2 sm:space-y-0">
                <div className="flex items-start space-x-3 w-full sm:w-auto">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 text-sm">
                    {candidate.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h5 className="font-semibold text-gray-900 truncate text-sm">{candidate.name}</h5>
                      {candidate.verified && (
                        <CheckCircle className="w-3 h-3 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-gray-600 text-xs">{candidate.title}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mt-1 text-xs text-gray-500 space-y-1 sm:space-y-0">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{candidate.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span>{candidate.availability}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" fill="currentColor" />
                        <span>{candidate.rating}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {candidate.skills.map((skill) => (
                        <span key={skill} className="px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors w-full sm:w-auto">
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <div className="text-blue-600 mt-0.5">✨</div>
            <div>
              <h5 className="font-medium text-blue-900 text-sm">Verified Quality</h5>
              <p className="text-xs text-blue-700">
                All talents go through technical and non-technical assessment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </OnboardingCard>
  );
}