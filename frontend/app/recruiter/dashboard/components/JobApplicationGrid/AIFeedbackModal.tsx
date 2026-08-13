"use client";
import {
  X,
  User,
  Mail,
  Phone,
  Linkedin,
  ExternalLink,
  Calendar,
  FileText,
  Download,
  MessageSquare,
  ListChecks,
  Target,
  Brain,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Star,
  TrendingUp,
  Clock,
  Award,
} from "lucide-react";

import { AiFeedbackItem } from "@/app/common/types";
import {
  fromSlug,
  getAssessmentDifficultyLevel,
  parsePythonListString,
} from "@/app/common/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/common/components/ui/tabs";
import { IntegrityScoreBadge } from "@/app/common/components/dashboard/ProctoringBadges";
import InfoTooltip from "@/app/common/components/InfoTooltip";
import ProctoringReportTab from "./ProctoringReportTab";
import AssessmentQuestionsTab from "./AssessmentQuestionsTab";
import AIInterviewTab from "./AIInterviewTab";

interface AIFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiFeedback: AiFeedbackItem;
}

const getStatusColor = (status: string) => {
  switch ((status || "").toLowerCase()) {
    case "pass":
    case "recommend":
    case "strongly recommend":
    case "validated":
    case "authentic":
      return "text-green-600 bg-green-50 border-green-200";
    case "fail":
    case "not recommend":
      return "text-red-600 bg-red-50 border-red-200";
    case "conditional":
    case "average":
    case "suspicious":
    case "likely ai-generated":
    case "questionable":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    default:
      return "text-blue-600 bg-blue-50 border-blue-200";
  }
};

const getStatusIcon = (status: string) => {
  switch ((status || "").toLowerCase()) {
    case "pass":
    case "recommend":
    case "validated":
    case "authentic":
      return <CheckCircle className='w-5 h-5' />;
    case "fail":
    case "not recommend":
      return <XCircle className='w-5 h-5' />;
    case "conditional":
    case "average":
    case "suspicious":
    case "likely ai-generated":
    case "questionable":
      return <AlertTriangle className='w-5 h-5' />;
    default:
      return <Target className='w-5 h-5' />;
  }
};

const CircularProgress = ({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = "#3B82F6",
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${
    (percentage / 100) * circumference
  } ${circumference}`;

  return (
    <div className='relative inline-flex items-center justify-center'>
      <svg width={size} height={size} className='transform -rotate-90'>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke='#E5E7EB'
          strokeWidth={strokeWidth}
          fill='none'
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill='none'
          strokeDasharray={strokeDasharray}
          strokeLinecap='round'
          className='transition-all duration-1000 ease-out'
        />
      </svg>
      <div className='absolute inset-0 flex items-center justify-center'>
        <span className='text-2xl font-bold text-gray-900'>{percentage}%</span>
      </div>
    </div>
  );
};

const AIFeedbackModal: React.FC<AIFeedbackModalProps> = ({
  isOpen,
  onClose,
  aiFeedback,
}) => {
  const portfolioSlug = aiFeedback.portfolio_slug;

  // Parse the Python-style list strings into proper arrays
  const resumeStrengths = parsePythonListString(
    aiFeedback.resume_strengths || ""
  );
  const resumeAreasForImprovement = parsePythonListString(
    aiFeedback.resume_areas_for_improvement || ""
  );

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4'>
      <div className='bg-white sm:rounded-2xl shadow-2xl max-w-6xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden'>
        {/* Header */}
        <div className='bg-primary text-white p-4 sm:p-6'>
          <div className='flex items-center justify-between gap-2'>
            <div className='flex items-center space-x-3 sm:space-x-4 min-w-0'>
              <div className='w-10 h-10 sm:w-12 sm:h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0'>
                <Brain className='w-5 h-5 sm:w-6 sm:h-6' />
              </div>
              <div className='min-w-0'>
                <h2 className='text-lg sm:text-2xl font-bold truncate'>AI Feedback Report</h2>
                <p className='text-blue-100 text-xs sm:text-base truncate'>
                  Comprehensive candidate analysis
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className='w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-colors'
            >
              <X className='w-6 h-6' />
            </button>
          </div>
        </div>

        {/* Content */}
        <Tabs defaultValue='feedback' className='overflow-y-auto max-h-[calc(100svh-88px)] sm:max-h-[calc(90vh-120px)]'>
          <TabsList className='mx-4 sm:mx-6 mt-4'>
            <TabsTrigger value='feedback'>Feedback</TabsTrigger>
            <TabsTrigger value='questions'>Questions</TabsTrigger>
            <TabsTrigger value='proctoring' className='gap-2'>
              Proctoring
              {aiFeedback.submission_id != null && (
                <IntegrityScoreBadge score={aiFeedback.proctoring_integrity_score} riskLevel={aiFeedback.proctoring_risk_level} />
              )}
            </TabsTrigger>
            {aiFeedback.ai_interview_id != null && <TabsTrigger value='ai-interview'>AI Interview</TabsTrigger>}
          </TabsList>

          <TabsContent value='feedback' className='mt-0'>
          <div className='p-6 space-y-8'>
            {/* Candidate Information */}
            <div className='bg-blue-50 rounded-2xl p-6 border border-gray-100'>
              <div className='flex items-center mb-6'>
                <div className='w-12 h-12 bg-primary rounded-full flex items-center justify-center mr-4'>
                  <User className='w-6 h-6 text-white' />
                </div>
                <h3 className='text-2xl font-bold text-gray-900'>
                  Candidate Profile
                </h3>
              </div>

              <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                <div className='bg-white rounded-xl p-4 shadow-sm'>
                  <h4 className='text-xl font-semibold text-gray-900 mb-2'>
                    {aiFeedback.talent_name}
                  </h4>
                  <div className='space-y-2'>
                    <div className='flex items-center text-gray-600'>
                      <Mail className='w-4 h-4 mr-2 shrink-0' />
                      <a
                        href={`mailto:${aiFeedback.email}`}
                        className='hover:text-blue-600 transition-colors truncate'
                      >
                        {aiFeedback.email}
                      </a>
                    </div>
                    <div className='flex items-center text-gray-600'>
                      <Phone className='w-4 h-4 mr-2 shrink-0' />
                      {aiFeedback.phone_number ? (
                        <a
                          href={`tel:${aiFeedback.phone_number}`}
                          className='hover:text-blue-600 transition-colors'
                        >
                          {aiFeedback.phone_number}
                        </a>
                      ) : (
                        <span>N/A</span>
                      )}
                    </div>
                    <div className='flex items-center text-gray-600'>
                      <Linkedin className='w-4 h-4 mr-2 shrink-0' />
                      {aiFeedback.linkedin_url ? (
                        <a
                          href={aiFeedback.linkedin_url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='hover:text-blue-600 transition-colors truncate'
                        >
                          LinkedIn Profile
                        </a>
                      ) : (
                        <span>N/A</span>
                      )}
                    </div>
                    {aiFeedback.portfolio_slug && (
                      <div className='flex items-center text-gray-600'>
                        <ExternalLink className='w-4 h-4 mr-2 shrink-0' />
                        <a
                          href={`/talents/${aiFeedback.portfolio_slug}/portfolio`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='hover:text-blue-600 transition-colors'
                        >
                          Portfolio
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className='space-y-4'>
                  <div className='bg-white rounded-xl p-4 shadow-sm'>
                    <h5 className='font-semibold text-gray-900 mb-3 flex items-center'>
                      <FileText className='w-4 h-4 mr-2' />
                      Resume
                    </h5>
                    {aiFeedback.resume ? (
                      <a
                        href={aiFeedback.resume}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium'
                      >
                        <Download className='w-4 h-4 mr-1.5' />
                        View resume
                      </a>
                    ) : (
                      <div className='font-medium text-gray-900'>N/A</div>
                    )}
                  </div>

                  <div className='bg-white rounded-xl p-4 shadow-sm'>
                    <h5 className='font-semibold text-gray-900 mb-2 flex items-center'>
                      <MessageSquare className='w-4 h-4 mr-2' />
                      Cover Letter
                    </h5>
                    <p className='text-gray-700 leading-relaxed text-sm whitespace-pre-wrap'>
                      {aiFeedback.cover_letter || "No cover letter submitted."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Resume Screening Results */}
            <div className='bg-blue-50 rounded-2xl p-6 border border-blue-100'>
              <div className='flex items-center mb-6'>
                <div className='w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mr-4'>
                  <FileText className='w-6 h-6 text-white' />
                </div>
                <h3 className='text-2xl font-bold text-gray-900'>
                  Resume Screening Analysis
                </h3>
              </div>

              <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8'>
                <div className='lg:col-span-1 flex justify-center'>
                  <div className='text-center'>
                    <CircularProgress
                      percentage={aiFeedback.resume_analysis_score}
                      color='#3B82F6'
                    />
                    <div className='mt-4'>
                      <div className='text-lg font-semibold text-gray-900'>
                        Overall Score
                      </div>
                      <div className='text-gray-600'>Resume Analysis</div>
                    </div>
                  </div>
                </div>

                <div className='lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='bg-white rounded-xl p-4 shadow-sm'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-sm font-medium text-gray-700'>
                        Resume Review
                      </span>
                      <span className='text-lg font-bold text-gray-900'>
                        {aiFeedback.resume_review_score}
                      </span>
                    </div>
                    <div className='w-full bg-gray-200 rounded-full h-2'>
                      <div
                        className='bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000'
                        style={{
                          width: `${
                            (aiFeedback.resume_review_score / 30) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className='bg-white rounded-xl p-4 shadow-sm'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-sm font-medium text-gray-700'>
                        Skill Matching
                      </span>
                      <span className='text-lg font-bold text-gray-900'>
                        {aiFeedback.resume_skill_matching_score}
                      </span>
                    </div>
                    <div className='w-full bg-gray-200 rounded-full h-2'>
                      <div
                        className='bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-1000'
                        style={{
                          width: `${
                            (aiFeedback.resume_skill_matching_score / 30) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className='bg-white rounded-xl p-4 shadow-sm'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-sm font-medium text-gray-700'>
                        Experience Relevance
                      </span>
                      <span className='text-lg font-bold text-gray-900'>
                        {aiFeedback.resume_experience_relevance_score}
                      </span>
                    </div>
                    <div className='w-full bg-gray-200 rounded-full h-2'>
                      <div
                        className='bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-1000'
                        style={{
                          width: `${
                            (aiFeedback.resume_experience_relevance_score /
                              25) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className='bg-white rounded-xl p-4 shadow-sm'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-sm font-medium text-gray-700'>
                        Education & Certifications
                      </span>
                      <span className='text-lg font-bold text-gray-900'>
                        {aiFeedback.resume_education_certification_score}
                      </span>
                    </div>
                    <div className='w-full bg-gray-200 rounded-full h-2'>
                      <div
                        className='bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-1000'
                        style={{
                          width: `${
                            (aiFeedback.resume_education_certification_score /
                              10) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Indicators */}
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
                <div
                  className={`rounded-xl p-4 border ${getStatusColor(
                    aiFeedback.resume_role_match_status
                  )}`}
                >
                  <div className='flex items-center mb-2'>
                    {getStatusIcon(aiFeedback.resume_role_match_status)}
                    <span className='ml-2 font-medium'>Role Match</span>
                    <InfoTooltip description='How closely the candidate&apos;s past job titles, responsibilities, and background line up with what this specific role requires.' />
                  </div>
                  <div className='text-sm capitalize'>
                    {fromSlug(aiFeedback.resume_role_match_status)}
                  </div>
                </div>

                <div
                  className={`rounded-xl p-4 border ${getStatusColor(
                    aiFeedback.resume_text_authencity
                  )}`}
                >
                  <div className='flex items-center mb-2'>
                    {getStatusIcon(aiFeedback.resume_text_authencity)}
                    <span className='ml-2 font-medium'>Text Authenticity</span>
                  </div>
                  <div className='text-sm capitalize'>
                    {fromSlug(aiFeedback.resume_text_authencity)}
                  </div>
                  {aiFeedback.resume_text_authencity_explanation && (
                    <div className='text-xs mt-1.5 opacity-80 normal-case'>
                      {aiFeedback.resume_text_authencity_explanation}
                    </div>
                  )}
                  {["suspicious", "likely ai-generated"].includes(
                    (aiFeedback.resume_text_authencity || "").toLowerCase()
                  ) && (
                    <div className='text-xs mt-1.5 italic opacity-70 normal-case'>
                      Informational only -- doesn&apos;t disqualify the candidate.
                    </div>
                  )}
                </div>

                <div
                  className={`rounded-xl p-4 border ${getStatusColor(
                    aiFeedback.resume_experience_validation
                  )}`}
                >
                  <div className='flex items-center mb-2'>
                    {getStatusIcon(aiFeedback.resume_experience_validation)}
                    <span className='ml-2 font-medium'>Experience</span>
                    <InfoTooltip description='Whether the candidate&apos;s years and depth of relevant experience meet what this role calls for.' />
                  </div>
                  <div className='text-sm capitalize'>
                    {fromSlug(aiFeedback.resume_experience_validation)}
                  </div>
                </div>

                <div
                  className={`rounded-xl p-4 border ${getStatusColor(
                    aiFeedback.resume_achievement_quality
                  )}`}
                >
                  <div className='flex items-center mb-2'>
                    {getStatusIcon(aiFeedback.resume_achievement_quality)}
                    <span className='ml-2 font-medium'>Achievements</span>
                  </div>
                  <div className='text-sm'>
                    {aiFeedback.resume_achievement_quality || "N/A"}
                  </div>
                </div>
              </div>

              {/* Detailed Analysis */}
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                <div className='bg-white rounded-xl p-6 shadow-sm'>
                  <h4 className='font-semibold text-gray-900 mb-4 flex items-center'>
                    <Star className='w-5 h-5 text-yellow-500 mr-2' />
                    Strengths
                  </h4>
                  <ul className='space-y-2'>
                    {resumeStrengths.map((strength: string, index: number) => (
                      <li key={index} className='flex items-start'>
                        <CheckCircle className='w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0' />
                        <span className='text-gray-700 text-sm'>
                          {strength}
                        </span>
                      </li>
                    ))}
                    {!resumeStrengths.length && (
                      <div className='font-medium text-gray-900'>N/A</div>
                    )}
                  </ul>
                </div>

                <div className='bg-white rounded-xl p-6 shadow-sm'>
                  <h4 className='font-semibold text-gray-900 mb-4 flex items-center'>
                    <TrendingUp className='w-5 h-5 text-blue-500 mr-2' />
                    Areas for Improvement
                  </h4>
                  <ul className='space-y-2'>
                    {resumeAreasForImprovement.map(
                      (area: string, index: number) => (
                        <li key={index} className='flex items-start'>
                          <AlertTriangle className='w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0' />
                          <span className='text-gray-700 text-sm'>{area}</span>
                        </li>
                      )
                    )}
                    {!resumeAreasForImprovement.length && (
                      <div className='font-medium text-gray-900'>N/A</div>
                    )}
                  </ul>
                </div>
              </div>

              {/* Final Recommendation */}
              <div
                className={`mt-6 rounded-xl p-6 border ${getStatusColor(
                  aiFeedback.resume_recommendations
                )}`}
              >
                <div className='flex items-center'>
                  {getStatusIcon(aiFeedback.resume_recommendations)}
                  <div className='ml-3'>
                    <div className='font-semibold'>Final Recommendation</div>
                    <div className='text-sm mt-1'>
                      {aiFeedback.resume_recommendations}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Assessment Results */}
            {aiFeedback.submission_id != null ? (
              <div className='relative overflow-hidden bg-blue-50 rounded-3xl p-8 border border-indigo-100 shadow-xl'>
                {/* Background decoration */}
                <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200/30 to-blue-200/30 rounded-full -translate-y-16 translate-x-16'></div>
                <div className='absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full translate-y-12 -translate-x-12'></div>

                <div className='flex items-center mb-6'>
                  <div className='w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mr-6 shadow-lg'>
                    <Brain className='w-6 h-6 text-white' />
                  </div>
                  <div>
                    <h3 className='text-3xl font-bold text-gray-900'>
                      Assessment Results
                    </h3>
                    <p className='text-gray-600 mt-1'>
                      Comprehensive skill evaluation
                    </p>
                  </div>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'>
                  {/* Main Score Display */}
                  <div className='flex justify-center lg:justify-start'>
                    <div className='text-center'>
                      <CircularProgress
                        percentage={aiFeedback.assessment_score}
                        size={160}
                        strokeWidth={12}
                        color='#8B5CF6'
                      />
                      <div className='mt-6'>
                        <div className='text-xl font-bold text-gray-900'>
                          Assessment Score
                        </div>
                        <div className='text-gray-600 mt-1'>
                          {aiFeedback.assessment_title || "Comprehensive evaluation"}
                        </div>

                        {/* Score interpretation -- tied to the assessment's
                            actual passing grade, not a guessed threshold */}
                        <div className='mt-4 inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary text-white border border-white'>
                          {aiFeedback.is_passed ? (
                            <>
                              <CheckCircle className='w-4 h-4 mr-2' />
                              Passed
                            </>
                          ) : (
                            <>
                              <AlertTriangle className='w-4 h-4 mr-2' />
                              Needs Improvement
                            </>
                          )}
                          {aiFeedback.passing_grade != null && (
                            <span className='ml-1.5 opacity-80'>
                              (pass mark {aiFeedback.passing_grade}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assessment Details */}
                  <div className='space-y-4'>
                    <h4 className='text-lg font-semibold text-gray-900 mb-4'>
                      Assessment Details
                    </h4>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      <div className='bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50'>
                        <div className='flex items-center mb-3'>
                          <div className='w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-3'>
                            <Clock className='w-5 h-5 text-white' />
                          </div>
                          <div>
                            <div className='text-2xl font-bold text-gray-900'>
                              {aiFeedback.time_taken || 0} min
                            </div>
                            <div className='text-sm text-gray-600'>
                              Time Taken
                              {aiFeedback.duration_minutes != null &&
                                ` of ${aiFeedback.duration_minutes} min`}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className='bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50'>
                        <div className='flex items-center mb-3'>
                          <div className='w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-3'>
                            <Award className='w-5 h-5 text-white' />
                          </div>
                          <div>
                            <div className='text-2xl font-bold text-gray-900'>
                              {getAssessmentDifficultyLevel(aiFeedback.difficulty_level)}
                            </div>
                            <div className='text-sm text-gray-600'>
                              Difficulty
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className='bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50'>
                        <div className='flex items-center mb-3'>
                          <div className='w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-3'>
                            <ListChecks className='w-5 h-5 text-white' />
                          </div>
                          <div>
                            <div className='text-2xl font-bold text-gray-900'>
                              {aiFeedback.total_questions ?? "N/A"}
                            </div>
                            <div className='text-sm text-gray-600'>
                              Total Questions
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className='bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50'>
                        <div className='flex items-center mb-3'>
                          <div className='w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-3'>
                            <Calendar className='w-5 h-5 text-white' />
                          </div>
                          <div>
                            <div className='text-2xl font-bold text-gray-900'>
                              {aiFeedback.completed_at
                                ? new Date(aiFeedback.completed_at).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "N/A"}
                            </div>
                            <div className='text-sm text-gray-600'>
                              Completed On
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key topics tested */}
                {aiFeedback.topics_tested && aiFeedback.topics_tested.length > 0 && (
                  <div className='bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 mb-6'>
                    <h4 className='font-semibold text-gray-900 mb-3 flex items-center'>
                      <ListChecks className='w-4 h-4 mr-2' />
                      Key Topics Tested
                    </h4>
                    <div className='flex flex-wrap gap-2'>
                      {aiFeedback.topics_tested.map((topic, index) => (
                        <span
                          key={index}
                          className='text-sm font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary'
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assessment Feedback */}
                <div className='bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/50'>
                  <h4 className='text-xl font-bold text-gray-900 mb-6 flex items-center'>
                    <div className='w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3'>
                      <Brain className='w-4 h-4 text-white' />
                    </div>
                    AI Assessment Feedback
                  </h4>
                  <div className='bg-blue-50 rounded-xl p-6 border border-purple-100'>
                    <p className='text-gray-700 leading-relaxed text-lg'>
                      Scored {aiFeedback.assessment_score.toFixed(1)}%
                      {aiFeedback.assessment_title && ` on "${aiFeedback.assessment_title}"`}
                      {aiFeedback.passing_grade != null &&
                        ` against a ${aiFeedback.passing_grade}% pass mark`}
                      , {aiFeedback.is_passed ? "meeting" : "falling short of"} the bar for this
                      role.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className='bg-blue-50 rounded-3xl p-8 border border-indigo-100 text-center'>
                <div className='w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4'>
                  <Brain className='w-6 h-6 text-white' />
                </div>
                <h3 className='text-xl font-bold text-gray-900 mb-1'>
                  Assessment Results
                </h3>
                <p className='text-gray-600'>
                  This candidate has not completed a skill assessment yet.
                </p>
              </div>
            )}
          </div>
          </TabsContent>

          <TabsContent value='questions' className='mt-0'>
            {aiFeedback.submission_id != null ? (
              <AssessmentQuestionsTab submissionId={aiFeedback.submission_id} />
            ) : (
              <p className='text-sm text-secondary-black text-center py-16'>
                No assessment attempt found for this applicant yet.
              </p>
            )}
          </TabsContent>

          <TabsContent value='proctoring' className='mt-0'>
            {aiFeedback.submission_id != null ? (
              <ProctoringReportTab submissionId={aiFeedback.submission_id} />
            ) : (
              <p className='text-sm text-secondary-black text-center py-16'>
                No assessment attempt found for this applicant yet.
              </p>
            )}
          </TabsContent>

          {aiFeedback.ai_interview_id != null && (
            <TabsContent value='ai-interview' className='mt-0'>
              <AIInterviewTab interviewId={aiFeedback.ai_interview_id} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default AIFeedbackModal;
