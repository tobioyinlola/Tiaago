"use client";
import {
  X,
  User,
  Mail,
  ExternalLink,
  Building,
  Calendar,
  GraduationCap,
  FileText,
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
import { useEffect, useState } from "react";

import { AiFeedbackItem } from "@/app/common/types";
import { getTalentPortfolio } from "@/app/common/services/talents";
import { usePortfolioStore } from "@/app/common/store/useWorkExperiences";
import {
  fromSlug,
  getAssessmentDifficultyLevel,
  parsePythonListString,
} from "@/app/common/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/common/components/ui/tabs";
import { IntegrityScoreBadge } from "@/app/common/components/dashboard/ProctoringBadges";
import ProctoringReportTab from "./ProctoringReportTab";
import AssessmentQuestionsTab from "./AssessmentQuestionsTab";

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
      return "text-green-600 bg-green-50 border-green-200";
    case "fail":
    case "not recommend":
      return "text-red-600 bg-red-50 border-red-200";
    case "conditional":
    case "average":
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
      return <CheckCircle className='w-5 h-5' />;
    case "fail":
    case "not recommend":
      return <XCircle className='w-5 h-5' />;
    case "conditional":
    case "average":
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
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  const { portfolios, updatePortfolio, certificates, updateCertificates } =
    usePortfolioStore();

  useEffect(() => {
    const fetcPortfolio = async () => {
      setLoadingPortfolio(true);
      const data = await getTalentPortfolio(portfolioSlug);
      if (!data.success) {
        console.log("Error fetching portfolio: ", data.error);
      } else {
        updatePortfolio(data.data!, portfolioSlug);
      }
      setLoadingPortfolio(false);
    };
    fetcPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioSlug]);

  const portfolioData = portfolios[portfolioSlug] ?? {};
  const experiences = portfolioData.experience ?? [];
  const education = portfolioData.education ?? [];
  const userBio = portfolioData.about;

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
                <div className='space-y-4'>
                  <div className='bg-white rounded-xl p-4 shadow-sm'>
                    <h4 className='text-xl font-semibold text-gray-900 mb-2'>
                      {aiFeedback.talent_name}
                    </h4>
                    <div className='space-y-2'>
                      <div className='flex items-center text-gray-600'>
                        <Mail className='w-4 h-4 mr-2' />
                        <a
                          href={`mailto:${aiFeedback.email}`}
                          className='hover:text-blue-600 transition-colors'
                        >
                          {aiFeedback.email}
                        </a>
                      </div>
                      <div className='flex items-center text-gray-600'>
                        <ExternalLink className='w-4 h-4 mr-2' />
                        <a
                          href={`/talents/${aiFeedback.portfolio_slug}/portfolio`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='hover:text-blue-600 transition-colors'
                        >
                          Portfolio
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className='bg-white rounded-xl p-4 shadow-sm'>
                    <h5 className='font-semibold text-gray-900 mb-2'>About</h5>
                    {loadingPortfolio ? (
                      <div className='flex items-center justify-center mt-4'>
                        <div className='w-4 h-4 border-2 border-t-primary rounded-full animate-spin' />
                      </div>
                    ) : (
                      <p
                        className='text-gray-700 leading-relaxed'
                        dangerouslySetInnerHTML={{ __html: userBio || "N/A" }}
                      />
                    )}
                  </div>
                </div>

                <div className='space-y-4'>
                  <div className='bg-white rounded-xl p-4 shadow-sm'>
                    <h5 className='font-semibold text-gray-900 mb-3 flex items-center'>
                      <Building className='w-4 h-4 mr-2' />
                      Work Experience
                    </h5>
                    <div className='space-y-3'>
                      {loadingPortfolio ? (
                        <div className='flex items-center justify-center mt-4'>
                          <div className='w-4 h-4 border-2 border-t-primary rounded-full animate-spin' />
                        </div>
                      ) : (
                        experiences.map((exp, index) => (
                          <div
                            key={index}
                            className='border-l-2 border-blue-200 pl-4'
                          >
                            <div className='font-medium text-gray-900'>
                              {exp.title}
                            </div>
                            <div className='text-blue-600 text-sm'>
                              {exp.company_name}
                            </div>
                            <div className='text-gray-500 text-xs flex items-center mt-1'>
                              <Calendar className='w-3 h-3 mr-1' />
                              {exp.start_date} - {exp.end_date || "Present"}
                            </div>
                            {/* <p className='text-gray-700 text-sm mt-2'>
                            {exp.description}
                          </p> */}
                          </div>
                        ))
                      )}
                      {!loadingPortfolio && !experiences.length && (
                        <div className='font-medium text-gray-900'>N/A</div>
                      )}
                    </div>
                  </div>

                  <div className='bg-white rounded-xl p-4 shadow-sm'>
                    <h5 className='font-semibold text-gray-900 mb-3 flex items-center'>
                      <GraduationCap className='w-4 h-4 mr-2' />
                      Education
                    </h5>
                    <div className='space-y-2'>
                      {loadingPortfolio ? (
                        <div className='flex items-center justify-center mt-4'>
                          <div className='w-4 h-4 border-2 border-t-primary rounded-full animate-spin' />
                        </div>
                      ) : (
                        education.map((edu, index) => (
                          <div key={index}>
                            <div className='font-medium text-gray-900'>
                              {edu.degree}
                            </div>
                            <div className='text-blue-600 text-sm'>
                              {edu.school}
                            </div>
                            <div className='text-gray-500 text-xs'>
                              {edu.start_date} - {edu.end_date || "Present"}
                            </div>
                          </div>
                        ))
                      )}
                      {!loadingPortfolio && !education.length && (
                        <div className='font-medium text-gray-900'>N/A</div>
                      )}
                    </div>
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
                </div>

                <div
                  className={`rounded-xl p-4 border ${getStatusColor(
                    aiFeedback.resume_experience_validation
                  )}`}
                >
                  <div className='flex items-center mb-2'>
                    {getStatusIcon(aiFeedback.resume_experience_validation)}
                    <span className='ml-2 font-medium'>Experience</span>
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
                    <div className='relative'>
                      <CircularProgress
                        percentage={aiFeedback.assessment_score}
                        size={160}
                        strokeWidth={12}
                        color='#8B5CF6'
                      />
                      {/* <div className='absolute inset-0 flex items-center justify-center'>
                        <div className='text-center'>
                          <div className='text-4xl font-bold text-gray-900'>
                            {aiFeedback.assessment_score}%
                          </div>
                          <div className='text-sm text-gray-600 mt-1'>
                            Overall
                          </div>
                        </div>
                      </div> */}
                    </div>
                    <div className='mt-6'>
                      <div className='text-xl font-bold text-gray-900'>
                        Assessment Score
                      </div>
                      <div className='text-gray-600 mt-1'>
                        Comprehensive evaluation
                      </div>

                      {/* Score interpretation */}
                      <div className='mt-4 inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary text-white border border-white'>
                        {aiFeedback.assessment_score >= 90 ? (
                          <>
                            <Star className='w-4 h-4 mr-2' />
                            Exceptional Performance
                          </>
                        ) : aiFeedback.assessment_score >= 80 ? (
                          <>
                            <CheckCircle className='w-4 h-4 mr-2' />
                            Strong Performance
                          </>
                        ) : aiFeedback.assessment_score >= 70 ? (
                          <>
                            <Target className='w-4 h-4 mr-2' />
                            Good Performance
                          </>
                        ) : (
                          <>
                            <AlertTriangle className='w-4 h-4 mr-2' />
                            Needs Improvement
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assessment Statistics */}
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
                            {+(aiFeedback.time_taken || "0") || 15} minutes
                          </div>
                          <div className='text-sm text-gray-600'>
                            Time Taken
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* <div className='bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50'>
                      <div className='flex items-center mb-3'>
                        <div className='w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-3'>
                          <Target className='w-5 h-5 text-white' />
                        </div>
                        <div>
                          <div className='text-2xl font-bold text-gray-900'>
                            {assessment.questions_correct}/
                            {assessment.questions_attempted}
                          </div>
                          <div className='text-sm text-gray-600'>
                            Questions Correct
                          </div>
                        </div>
                      </div>
                    </div> */}

                    {/* <div className='bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50'>
                      <div className='flex items-center mb-3'>
                        <div className='w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-3'>
                          <Award className='w-5 h-5 text-white' />
                        </div>
                        <div>
                          <div className='text-2xl font-bold text-gray-900'>
                            {getAssessmentDifficultyLevel(
                              aiFeedback.difficulty_level || "Intermediate"
                            )}
                          </div>
                          <div className='text-sm text-gray-600'>
                            Difficulty
                          </div>
                        </div>
                      </div>
                    </div> */}

                    {/* <div className='bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50'>
                      <div className='flex items-center mb-3'>
                        <div className='w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-3'>
                          <TrendingUp className='w-5 h-5 text-white' />
                        </div>
                        <div>
                          <div className='text-2xl font-bold text-gray-900'>
                            {Math.round(
                              (assessment.questions_correct /
                                assessment.questions_attempted) *
                                100
                            )}
                            %
                          </div>
                          <div className='text-sm text-gray-600'>Accuracy</div>
                        </div>
                      </div>
                    </div> */}
                  </div>
                </div>
              </div>

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
                    {/* {assessment.assessment_feedback} */}
                    Achieved {aiFeedback.assessment_score.toFixed(1)}%,
                    showcasing core skills in {aiFeedback.assessment_title}{" "}
                    essential to the role.
                  </p>
                </div>
              </div>
            </div>
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
        </Tabs>
      </div>
    </div>
  );
};

export default AIFeedbackModal;
