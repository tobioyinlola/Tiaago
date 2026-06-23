import type { IconType } from "react-icons";
import { CSSObjectWithLabel, GroupBase, StylesConfig } from "react-select";

export type ID = string | number;

export type ISearchParams = Readonly<
  Record<string, string | string[] | undefined>
>;

export type ApiResponseWithSuccess<T> = {
  success: true;
  data: T;
};

export type ApiResponseWithError = {
  success: false;
  error: string;
};

export type ApiResponse<T> = ApiResponseWithSuccess<T> | ApiResponseWithError;

export type PagedResource<T> = {
  current: number;
  count: number;
  next?: number | string;
  previous?: number | string;
  results: T[];
};

export type BasePageProps = {
  as?: "startup" | "talent" | "staff";
  isSignIn?: boolean;
};

export type PromiseResolvedType<T> = T extends Promise<infer R> ? R : never;

export type DashboardNavItem = {
  name: string;
  href: string;
  Icon: IconType;
  subLinks?: {
    name: string;
    href: string;
  }[];
};

export type DashboardNavItemV3 =
  | {
      name: string;
      href: string;
      Icon: IconType;
      type?: "item";
      tag?: string;
      exact?: boolean;
      requiredRoles?: TeamMemberRole[];
      subLinks?: {
        name: string;
        href: string;
        requiredRoles?: TeamMemberRole[];
      }[];
    }
  | {
      type: "divider";
    };

export type SelectFieldProps = {
  options?: any[];
  isMulti?: boolean;
  createable?: boolean;
  defaultValue?: any;
  styles?: Omit<
    StylesConfig<unknown, boolean, GroupBase<unknown>>,
    "control" | "option"
  > & {
    control?: CSSObjectWithLabel;
    option?: CSSObjectWithLabel;
  };
  value?: any;
};

export type FormField<T = Record<string, any>> = {
  name: keyof T;
  label: string;
  placeholder?: string;
  className?: string;
  inputContainerClassName?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
} & (
  | {
      type?:
        | "text"
        | "password"
        | "email"
        | "number"
        | "tel"
        | "url"
        | "date"
        | "textarea"
        | "year"
        | "richtext";
    }
  | {
      type: "select";
      selectFieldProps?: SelectFieldProps;
    }
  | {
      type: "file";
      fileFieldProps?: {
        accept?: string;
        acceptText?: string;
      };
    }
);

export type CountryField = {
  value: string;
  label: string;
  region: string;
};

export type BaseUser = {
  id: ID;
  pk: ID;
  bio: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_pic?: string;
  phone_number: string;
  country: string;
  verified: boolean;
  auth_provider?: "email" | "google";
  is_staff: boolean;
  is_superuser: boolean;
  subscribed_plan: null | {
    plan_id: number;
    plan: string;
    is_active: true;
  };
  billing_type: "subscription" | "wallet";
  subscription: {
    provider: "stripe" | "paystack";
    plan: string;
    status: string;
    resume_limit: number;
    assessment_limit: number;
    resume_used?: number;
    assessment_used?: number;
    cancelled_at: string | null;
  };
  wallet_balance: number;
  created: string;
};

export type Talent = BaseUser & {
  role: string;
  experience_level: string;
  portfolio: string;
  resume: string;
  user_type: "T";
  has_passed_assessment: boolean;
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  social_media_links: { name: string; url: string }[];
};

export type Startup = BaseUser & {
  bio?: string;
  role: string;
  size: string;
  company_name: string;
  company_email: string;
  user_type: "CR";
  address: string;
  website: string;
  profile_pic: string;
  account_type?: string;
  industry?: string;
  heard_from?: string;
  onboarding_notes?: string;
  onboarding_completed_at?: string | null;
  onboarding_skipped_at?: string | null;
};

export type Staff = BaseUser & {
  user_type: "ST";
  is_staff: true;
};

export type User = Talent | Startup | Staff;

export type TeamMemberRole = "admin" | "recruiter" | "viewer";

export type TeamMember = {
  id: ID;
  company: ID;
  user: ID;
  user_full_name: string;
  user_email: string;
  user_profile_pic?: string | null;
  role: TeamMemberRole;
  created_at: string;
};

export type TeamInvite = {
  id: ID;
  company: ID;
  email: string;
  role: TeamMemberRole;
  token: string;
  status: "pending" | "accepted" | "revoked";
  created_at: string;
  is_expired: boolean;
  inviter_name: string;
};

export type TeamListResponse = {
  members: TeamMember[];
  invites: TeamInvite[];
  company_id: number;
  user_role: TeamMemberRole;
};

export type TalentPortfolioWorkExperience = {
  id: ID;
  portfolio?: ID;
  title: string;
  company_name: string;
  employment_type: Job["job_type"];
  company_logo_url?: string;
  start_date: string;
  end_date?: string;
};

export type TalentPortfolioProject = {
  id: ID;
  portfolio?: ID;
  name: string;
  image: string;
  link: string;
};

export type TalentPortfolioEducation = {
  id: ID;
  portfolio?: ID;
  school: string;
  program: string;
  degree: string;
  start_date: string;
  end_date?: string;
};

export type TalentPortfolioTool = {
  id: ID;
  name: string;
  category: string;
  icon?: string;
};

export type TalentPortfolio = {
  banner?: string;
  about?: string;
  slug: string;
  tools: TalentPortfolioTool[];
  experience: TalentPortfolioWorkExperience[];
  projects?: TalentPortfolioProject[];
  certifications: any[];
  education: TalentPortfolioEducation[];
  full_name: string;
  country: string;
  profile_picture?: string;
  is_verified: boolean;
  role: TalentRole;
};

export type Message = {
  id: ID;
  sender: ID;
  text: string;
  read?: boolean;
  timestamp: string;
  attachment?: string;
};

export type Chat = {
  id: ID;
  initiator: SimpleUser;
  receiver: SimpleUser;
  messages: Message[];
  online: ID[];
};

export type SimpleUser = {
  id: ID;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  verified: boolean;
  user_type: User["user_type"];
  profile_pic?: string;
};

export interface IChatListItem {
  id: ID;
  other_user: SimpleUser;
  last_message?: Message;
}

export type PaymentAccount = {
  country: string;
  currency: {
    name: string;
    symbol: string;
  };
  countryFlag: {
    png: string;
    svg: string;
    alt: string;
  };
};

export type PaymentCard = {
  card_last4: string;
  card_brand: string;
  exp_month: number;
  exp_year: number;
  id: ID;
  is_default: boolean;
};

export type SubscriptionPlan = {
  pk: number;
  name: string;
  sub_type: "PR" | "BS";
  user_type: Talent["user_type"] | Startup["user_type"];
  amount: string;
  no_of_days: number;
  details?: string;
  currency?: string;
};

export type SubscriptionPlanV3 = {
  id: ID;
  name: string;
  plan_code: string;
  currency?: string;
  amount: number;
  interval: "monthly" | "annually" | "yearly";
  created_at?: string;
};

export type SubscriptionInvoice = {
  id: ID;
  ref: string;
  date_created: string;
  status: "success" | "pending" | "failed";
  plan_id: number;
};

export type CountryCitiesMap = {
  [country: string]: string[];
};

export type TalentRole = {
  id: ID;
  title: string;
  is_technical: boolean;
  slug: string;
};

export type GetProfileArgs = {
  nullUserRedirect?: string;
  validUserRedirect?: string;
  allowNull?: boolean;
};

export type Job = {
  id: ID;
  title: string;
  tags: string[];
  role: ID;
  role_title: string;
  salary_duration: "PH" | "PM" | "CT";
  payment_range: string;
  payment_range_usd: string;
  payment_range_ngn: string;
  payment_currency: string;
  experience: number;
  job_type: "FT" | "PT" | "CW" | "IN"; //FT-full time, PT-part time, CW-contract, IN-internship
  job_status: "ACTIVE" | "ON_HOLD" | "HIRED" | "EXPIRED";
  location: string;
  description: string;
  about_company: string;
  job_requirement: string;
  date_created: string;
  was_approved: boolean;
  hiring_type: "Manually" | "With AI";
  no_of_applications: number;
  requires_assessment?: boolean;
  assessment_id?: ID;
  get_apply_url?: string;
  detail_url?: string;
  company: {
    id: ID;
    company_name: string;
    website: string;
    address: string;
    logo?: string;
  };
  completed_assessments_count?: number;
};

export type JobFormPayload = {
  role: ID;
  experience: number;
  job_type: string;
  payment_type: string;
  payment_range: string;
  country: string;
  city: string;
  description: string;
};

export type JobApplication = {
  id: ID;
  applicant: {
    id: ID;
    name: string;
    email: string;
    country: string;
    phone_number: string;
    resume: string;
    profile_pic?: string;
    role: string;
    experience_level: string;
    has_passed_assessment: boolean;
  };
  job: Job;
  company_name: string;
  company_logo: string;
  applied_date: string;
  cover_letter: string;
  status:
    | "APPLIED"
    | "REVIEWED"
    | "INTERVIEW_SCHEDULED"
    | "PENDING_DECISION"
    | "OFFER_EXTENDED"
    | "OFFER_ACCEPTED"
    | "OFFER_DECLINED"
    | "REJECTED"
    | "WITHDRAWN";
  created: string;
  last_updated: string;
};

export type ScheduledMeeting = {
  id: ID;
  title: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  talent: ID;
  room_name?: string;
  room_url?: string;
  token?: string;
  no_of_participants: number;
  company: string;
  company_name: string;
  company_logo: string;
  created_on: string;
  description: string;
  accepted: boolean;
};

export type SkillAssessment = {
  id: ID;
  quiz_id: ID;
  project_id: ID;
  quiz_name: string;
  project_name: string;
  talent_name: string;
  has_passed: boolean;
};

export type SkillAssessmentQuiz = {
  id: ID;
  name: string;
  question_count: number;
  description: string;
  questions_on: string[];
  minutes: number;
  created: string;
  slug: string;
  roll_out: boolean;
  roles: ID[];
  updated: string;
};

export type MCQSection = {
  id: ID;
  name: string;
  type: "MCQ";
  mcq_questions: {
    id: ID;
    is_ai_generated: boolean;
    question: string;
    options: {
      index: number;
      label: string;
    }[];
    correct_option_index: number;
  }[];
  coding_task: null;
  question_count: number;
};

export type MCQAnswer = { selected_option_index: number; mcq_id: ID };

export type CodingTaskSection = {
  id: ID;
  name: string;
  type: "CODING_TASK";
  mcq_questions: null;
  question_count: number;
  coding_tasks: {
    id: ID;
    title: string;
    description: string;
    test_cases: {
      input_data: string;
      expected_output: string;
      is_sample: boolean;
    }[];
    input_format: null | string;
    output_format: null | string;
    constraints: null | string;
    sample_input: null | string;
    sample_output: null | string;
    difficulty_level: string;
    max_score: number;
    time_limit: number;
  }[];
};

export type CompanySkillAssessment = {
  id: ID;
  title: string;
  difficulty_level: string;
  skillsets: {
    id: ID;
    title: string;
  }[];
  description: string;
  duration_minutes: number;
  passing_grade: number;
  display_review_and_approve_responses: boolean;
  display_feedback: boolean;
  shuffle_questions: boolean;
  use_public_link: boolean;
  use_start_and_end_time: boolean;
  assessment_type: string;
  sections: (MCQSection | CodingTaskSection)[];
};

export type SkillAssessmentResult = {
  id: ID;
  total_score: number;
  time_taken: number;
  stats: {
    mcq: {
      attempted: number;
      correct: number;
      total: number;
      percent: number;
    };
    coding: {
      attempted: number;
      score: number;
      total: number;
      percent: number;
    };
  };
};

export type AssessmentStack = {
  id: ID;
  stack: string;
  slug: string;
  difficulty_level?: string;
};

export type AiFeedbackItem = {
  application_id: ID;
  talent_id: ID;
  talent_name: string;
  role: string;
  resume_analysis_score: number;
  cultural_fitness_score: number;
  overall_score: number;
  resume_feedback: string | null;
  overall_feedback: string | null;
  prescreening_feedback: string;
  assessment_score: number;
  email: string;
  portfolio_slug: string;
  assessment_title: string;
  has_passed_tiaago_assessment: boolean;
  profile_picture?: string;
  resume: string;
  resume_role_match_status: string;
  resume_text_authencity: string;
  resume_text_authencity_explanation: string;
  resume_experience_validation: string;
  resume_experience_validation_explanation: string;
  resume_review_score: number;
  resume_skill_matching_score: number;
  resume_education_certification_score: number;
  resume_experience_score: number;
  resume_experience_relevance_score: number;
  resume_strengths: string;
  resume_areas_for_improvement: string;
  resume_recommendations: string;
  resume_achievement_quality: string;
  time_taken: string;
  difficulty_level: CompanySkillAssessment["difficulty_level"];
  cover_letter: string;
};

export type QuizAttempt = {
  id: ID;
  talent: string;
  quiz: string;
  correct_answers: number;
  no_of_questions: number;
  completed: boolean;
  timestamp: string;
  created: string;
  updated: string;
};

export type QuizAttemptInitialize = {
  id: ID;
  talent: ID;
  quiz: ID;
  correct_answers: number;
  no_of_questions: number;
  completed: boolean;
  timestamp: string;
  created: string;
  updated: string;
  questions: AssessmentQuestion[];
};

export type AssessmentQuestion = {
  id: ID;
  quiz: ID[];
  label: string;
  options: Record<string, string>;
  created: string;
  updated: string;
};

export type CaseStudyProject = {
  id: ID;
  title: string;
  about: string;
  roles: ID[];
  role_names: string[];
};

export type CaseStudyAttempt = {
  id: ID;
  project: string;
  project_id: string;
  talent: string;
  user_id: string;
  approved: boolean;
  submission?: string;
  remark?: string;
  created: string;
  updated: string;
  last_attempt: string;
};

export type Contract = {
  id: ID;
  // talent: string;
  talent_email: string;
  full_name: string;
  company: string;
  role: ID;
  role_name: string;
  mode: string;
  value: number;
  account_name: string;
  account_number: string;
  bank_name: string;
  currency?: string;
  expires: string;
  created: string;
  updated: string;
};

export type WorkExperience = {
  id: ID;
  organization: string;
  organization_logo?: string;
  role: string;
  year_from: string;
  year_to: string;
  talent: string;
};

export type TalentEducation = {
  id: ID;
  school: string;
  program: string;
  degree: string;
  year_from: string;
  year_to: string;
};

export type TalentProfileStatus = {
  created_account: boolean;
  has_added_work_experience: boolean;
  has_social_media_links: boolean;
  has_taken_assessment: boolean;
};

export type CompanyAccountType =
  | "in-house"
  | "agency"
  | "hiring-company"
  | "independent";

export type CompanyOnboarding = {
  account_type: CompanyAccountType | "";
  company_name: string;
  website: string | null;
  industry: string;
  size: string | null;
  role: string | null;
  phone_number?: string;
  heard_from: string;
  heard_from_other: string;
  onboarding_notes: string;
  onboarding_completed_at: string | null;
  onboarding_skipped_at: string | null;
  has_completed_onboarding: boolean;
  has_skipped_onboarding: boolean;
};

export type ReferredUser = {
  id: ID;
  invitee_email: string;
  invitee_profile_pic?: string;
  date_invited: string;
  reward: string;
  has_received_reward: boolean;
  inviter_name: string;
  invitee_name: string;
};

export type AssessmentCert = {
  id: ID;
  issued_at: string;
  certificate_url?: string;
  recipient: {
    talent_id: ID;
    full_name: string;
    username: string;
    email: string;
  };
  assessment: {
    id: ID;
    title: string;
    difficulty_level: string;
    category?: string;
  };
};

export type AssessmentCert2 = {
  id: ID;
  issued_at: string;
  certificate_url?: string;
  talent: {
    id: ID;
    full_name: string;
    user_id: ID;
  };
  skill_assessment: {
    id: ID;
    title: string;
    difficulty_level: string;
  };
};

export type AssessmentCert3 = {
  talent_name: string;
  skill_title: string;
  issued_at: string;
  certificate_url?: string;
};

export interface Community {
  id: ID;
  name: string;
  description?: string;
  created_at: string;
}

export interface Coupon {
  id: ID;
  code: string;
  community_id: number;
  community_name: string;
  discount_amount_ngn?: string;
  discount_amount_usd?: string;
  discount_percent?: number;
  max_usage: number;
  used_count: number;
  expires_at: string;
  created_at: string;
  remaining_uses?: string;
}

export type WalletTransaction = {
  id: ID;
  wallet: string;
  amount: number | string;
  transaction_type: "credit" | "debit";
  currency: string;
  reference: string;
  created_at: string;
};

export type SubscriptionTransaction = {
  id: ID;
  company: ID;
  company_email: string;
  provider: "stripe" | "paystack";
  amount: number;
  status: "pending" | "succeeded" | "failed" | "success";
  channel: "card" | "bank";
  reference: string;
  plan_name?: string;
  next_payment_date?: string;
  paid_at: string;
  created_at: string;
};

export type SubscriptionUsage = {
  user: string;
  resume_limit: number;
  assessment_limit: number;
  resumes_used: number;
  assessments_used: number;
  resume_remaining: number;
  assessment_remaining: number;
};

export type WalletUsage = {
  user: string;
  wallet_balance: number;
  resumes_used: number;
  assessments_used: number;
  total_amount_spent: number;
};

export type ReferralWithdrawal = {
  id: ID;
  amount: number | string;
  fee: number | string;
  net_amount: number | string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  bank_name: string;
  account_name: string;
  account_number: string;
  reference: string;
  talent_name: string;
  talent_email: string;
  transfer_code?: string;
  failure_reason?: string;
  approved_by?: ID;
  date_created: string;
  approved_at?: string;
  completed_at?: string;
  date_modified: string;
};

export type ServerCandidateExperience = {
  company: {
    name: string;
    size: string | null;
    id: string | null;
    founded: string | number | null;
    industry: string | null;
    location: null | {
      name: string;
      locality: string | null;
      region: string;
      metro: string | null;
      country: string;
      continent: string;
      street_address: string | null;
      address_line_2: string | null;
      postal_code: string | null;
      geo: string | null;
    };
    linkedin_url: string | null;
    linkedin_id: string | null;
    facebook_url: string | null;
    twitter_url: string | null;
    website: string | null;
    ticker: string | null;
    type: string | null;
  };
  title: {
    name: string;
    class: string | null;
    role: string | null;
    sub_role: string | null;
    levels: string[];
  };
  location_names: string[];
  start_date: string;
  end_date: string | null;
  is_primary: boolean;
  summary: string | null;
};

export type ServerCandidate = {
  name: string;
  role: string;
  country: string;
  years_of_expr: number;
  email?: string;
  linkdIn_profile: string;
  phone_number?: string;
  summary: string | null;
  current_company: string;
  education: string;
  skills: string[];
  avatar?: string;
  experience: ServerCandidateExperience[];
  portfolio_url?: string;
  resume?: string;
  experience_level?: string;
  current_pay?: string;
  pay_currency?: string;
};

export type PipelineEntry = ServerCandidate & {
  id: ID;
  status: string;
  created_at: string;
};

export type GetPipelineResponse = {
  total_in_pipeline: number;
  total_contacted: number;
  total_new: number;
  entries: PipelineEntry[];
};

export type PipelineCategory = {
  id: ID;
  name: string;
  description: string;
  is_active: boolean;
  candidate_count: number;
  created_at: string;
};

export type SourcingSearchInput = {
  main_role: string;
  specializations: string[];
  location?: string;
  experience_level?: string;
  years_of_experience?: number;
  number_of_candidates: number;
};

// temp
export interface CandidateWorkExperience {
  company: string;
  role: string;
  duration: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: string;
  location: string;
  country: string;
  experience: string;
  skills: string[];
  technicalScore: number;
  culturalScore: number;
  overallScore: number;
  linkedIn?: string;
  summary: string;
  currentCompany?: string;
  workExperience?: CandidateWorkExperience[];
  education?: string;
  sourcedAt?: Date;
  status: "new" | "contacted" | "interested" | "not-interested" | "hired";
}

export interface SourcingRequest {
  skills: string[];
  country: string;
  experienceLevel: string;
  jobDescription: string;
  candidateCount: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}
