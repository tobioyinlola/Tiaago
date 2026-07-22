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
  as?: "recruiter" | "talent" | "staff";
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
      // Admin/staff-only: maps this nav item to a staff RBAC section key
      // (see admin/(dashboard)/constants/nav.tsx and AdminSectionGate).
      // Unrelated to requiredRoles, which is company-team-scoped.
      section?: string;
      subLinks?: {
        name: string;
        href: string;
        requiredRoles?: TeamMemberRole[];
        section?: string;
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

export type Recruiter = BaseUser & {
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

export type StaffRole = {
  name: string;
  slug: string;
};

export type Staff = BaseUser & {
  user_type: "ST";
  is_staff: true;
  staff_role: StaffRole | null;
  permissions: string[];
  is_super_admin: boolean;
};

export type User = Talent | Recruiter | Staff;

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
  user_type: Talent["user_type"] | Recruiter["user_type"];
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
  /** Non-guessable identifier for recruiter/admin/talent dashboard URLs --
   * use this (never the raw `id`) when building any internal link. */
  public_id: string;
  title: string;
  tags: string[];
  /** Free-text role/title typed by the recruiter -- not a Role id/FK. */
  role: string;
  role_title: string;
  salary_duration: "PH" | "PM" | "CT";
  payment_range: string;
  payment_range_usd: string;
  payment_range_ngn: string;
  payment_currency: string;
  experience: number;
  job_type: "FT" | "PT" | "CW" | "IN"; //FT-full time, PT-part time, CW-contract, IN-internship
  job_level: "ENTRY" | "JUNIOR" | "SENIOR";
  job_status: "DRAFT" | "ACTIVE" | "ON_HOLD" | "HIRED" | "EXPIRED";
  location: string;
  description: string;
  about_company: string;
  job_requirement: string;
  date_created: string;
  was_approved: boolean;
  hiring_type: "Manually" | "With AI";
  no_of_applications: number;
  view_count: number;
  requires_assessment?: boolean;
  assessment_id?: ID;
  get_apply_url?: string;
  detail_url?: string;
  /** Public candidate-facing token -- only present on public job-detail
   * responses (JobDetailView/JobByTokenAPIView), never on the internal
   * recruiter/admin JobRetrieveUpdateView response. */
  apply_token?: string;
  company: {
    id: ID;
    company_name: string;
    website: string;
    address: string;
    logo?: string;
  };
  completed_assessments_count?: number;
  screening_threshold?: number | null;
  assessment_time_limit?: number | null;
  proctoring_enabled?: boolean;
  require_fullscreen?: boolean;
  require_webcam?: boolean;
  webcam_snapshots_enabled?: boolean;
  snapshot_interval_seconds?: number;
  max_tab_switches_before_warning?: number;
  max_tab_switches_before_termination?: number;
  copy_paste_blocked?: boolean;
  right_click_blocked?: boolean;
  devtools_detection_enabled?: boolean;
  force_submit_on_critical_violation?: boolean;
};

export type InterviewSlotInput = {
  date: string;
  start_time: string;
  end_time: string;
};

/** Recruiter-facing day-of-week availability picker state (wizard form only)
 * -- expanded client-side into concrete InterviewSlotInput rows (the shape
 * the backend actually accepts) right before job submission. 0=Sun..6=Sat. */
export type InterviewAvailabilityInput = {
  days_of_week: number[];
  start_time: string;
  end_time: string;
};

export type InterviewSlot = InterviewSlotInput & {
  id: ID;
  job: ID;
  is_claimed: boolean;
};

export type JobAssessmentQuestionOption = {
  index: number;
  value: string;
};

export type JobAssessmentQuestion = {
  question: string;
  options: JobAssessmentQuestionOption[];
  correct_option_index: number;
  is_ai_generated?: boolean;
};

export type AssessmentQuestionSection = {
  category: string;
  questions: JobAssessmentQuestion[];
};

export type BlogCategory = {
  id: ID;
  name: string;
  slug: string;
  description: string;
  post_count: number;
};

export type BlogAuthor = {
  name: string;
  avatar: string | null;
  title: string | null;
};

export type BlogPostSummary = {
  id: ID;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string | null;
  category: BlogCategory | null;
  author: BlogAuthor | null;
  is_featured: boolean;
  is_pinned: boolean;
  published_at: string | null;
  reading_time_minutes: number;
};

export type BlogPost = BlogPostSummary & {
  content: string;
  key_takeaways: string[];
};

export type BlogPostManage = {
  id: ID;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  key_takeaways: string[];
  featured_image: string | null;
  category: ID | null;
  category_detail: BlogCategory | null;
  author: ID | null;
  author_name: string | null;
  custom_author_name: string;
  author_title: string;
  is_featured: boolean;
  is_pinned: boolean;
  status: "DRAFT" | "PUBLISHED";
  published_at: string | null;
  reading_time_minutes: number;
  created_at: string;
  updated_at: string;
};

export type BlogStaffAuthor = {
  id: ID;
  name: string;
};

export type BlogPostWritePayload = {
  title: string;
  category: ID | null;
  excerpt: string;
  content: string;
  key_takeaways: string[];
  status: "DRAFT" | "PUBLISHED";
  author: ID | null;
  custom_author_name: string;
  author_title: string;
  is_featured: boolean;
  is_pinned: boolean;
  featured_image_path?: string;
};

export type JobFormPayload = {
  role: string;
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

export type OpenEndedSectionQuestion = {
  id: ID;
  is_ai_generated: boolean;
  question: string;
  grading_guidance: string;
  max_score: number;
  skills_assessed: string[];
};

export type OpenEndedSection = {
  id: ID;
  name: string;
  type: "OPEN_ENDED";
  question_count: number;
  mcq_questions: null;
  coding_tasks: null;
  open_ended_questions: OpenEndedSectionQuestion[];
};

export type AssessmentBundleSummary = {
  id: ID;
  name: string;
  description: string;
  role: { id: ID; title: string };
  difficulty_level: string;
  estimated_duration_minutes: number;
  is_recommended: boolean;
  question_count: number;
};

export type TalentQuestionBankMCQ = {
  question: string;
  options: { value: string; index: number }[];
  correct_option_index: number;
  is_ai_generated?: boolean;
};

export type TalentQuestionBankCodingTask = {
  title: string;
  description: string;
  difficulty_level: string;
  constraints?: string;
  sample_input?: string;
  sample_output?: string;
  max_score?: number;
  time_limit?: number;
  test_cases?: { input_data: string; expected_output: string; is_sample?: boolean }[];
};

export type TalentQuestionBankOpenEnded = {
  question: string;
  grading_guidance?: string;
  max_score?: number;
  skills_assessed?: string[];
  is_ai_generated?: boolean;
};

export type TalentQuestionBankEntry = {
  id: ID;
  role: { id: ID; title: string } | null;
  stack: { id: ID; tech_stack: string } | null;
  difficulty_level: string;
  question_type: "MCQ" | "CODING_TASK" | "OPEN_ENDED" | null;
  mcq_question: TalentQuestionBankMCQ | null;
  coding_task: TalentQuestionBankCodingTask | null;
  open_ended_question: TalentQuestionBankOpenEnded | null;
  created_at: string;
};

export type AssessmentBundleAdmin = {
  id: ID;
  name: string;
  description: string;
  role: { id: ID; title: string };
  difficulty_level: string;
  estimated_duration_minutes: number;
  is_recommended: boolean;
  active: boolean;
  bank_questions: TalentQuestionBankEntry[];
  question_count: number;
};

export type ProctoringSettings = {
  proctoring_enabled: boolean;
  require_fullscreen: boolean;
  require_webcam: boolean;
  webcam_snapshots_enabled: boolean;
  snapshot_interval_seconds: number;
  max_tab_switches_before_warning: number;
  max_tab_switches_before_termination: number;
  copy_paste_blocked: boolean;
  right_click_blocked: boolean;
  devtools_detection_enabled: boolean;
  force_submit_on_critical_violation: boolean;
};

export type AssessmentInviteDetail = {
  assessment_title: string;
  duration_minutes: number;
  sections: { id: ID; name: string; type: "MCQ" | "CODING_TASK"; question_count: number }[];
  job_title: string | null;
  company_name: string | null;
  candidate_name: string;
  candidate_email: string;
  already_submitted: boolean;
  proctoring: ProctoringSettings | null;
  deadline: string | null;
  deadline_formatted: string | null;
  is_expired: boolean;
  is_standalone: boolean;
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
  sections: (MCQSection | CodingTaskSection | OpenEndedSection)[];
  /** Draft assessments (published: false) are still being built in the
   * wizard -- only a published assessment can be invited to candidates. */
  published?: boolean;
  /** Recruiter-controlled: whether a candidate can see their own score
   * after submitting. Defaults to true server-side. */
  show_results_to_candidate?: boolean;
  /** When this candidate's attempt began -- only present on the no-login
   * invite flow's questions response, anchors the overall countdown so it
   * survives page refresh instead of resetting. */
  started_at?: string | null;
};

export type SkillAssessmentResult = {
  id: ID;
  total_score: number | null;
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
  } | null;
  candidate_name?: string | null;
  candidate_email?: string | null;
  mark_status?: "Pending" | "Failed to Mark" | "Awaiting Manual Review" | "Marked";
  is_passed?: boolean;
  is_completed?: boolean;
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
  submission_id: ID | null;
  proctoring_integrity_score: number | null;
  proctoring_risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  proctoring_has_violation: boolean;
};

export type SubmissionAnswerMCQQuestion = {
  id: ID;
  question: string;
  options: { index: number; value: string }[];
  correct_option_index: number;
  selected_option_index: number | null;
  is_correct: boolean;
};

export type SubmissionAnswerCodingTask = {
  id: ID;
  title: string;
  description: string;
  candidate_answer: string;
};

export type SubmissionAnswerOpenEndedQuestion = {
  id: ID;
  question: string;
  grading_guidance: string;
  max_score: number;
  answer_id: ID | null;
  answer_text: string;
  ai_suggested_score: number | null;
  ai_suggested_feedback: string;
  score: number | null;
  feedback: string;
  is_graded: boolean;
};

export type SubmissionAnswersSection = {
  id: ID;
  name: string;
  type: "MCQ" | "CODING_TASK" | "OPEN_ENDED";
  questions?: SubmissionAnswerMCQQuestion[];
  coding_tasks?: SubmissionAnswerCodingTask[];
  open_ended_questions?: SubmissionAnswerOpenEndedQuestion[];
};

export type SubmissionAnswers = {
  sections: SubmissionAnswersSection[];
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
  transaction_type: "credit" | "debit" | "refund" | "adjustment";
  service_type?: "resume_screening" | "assessment" | "wallet_topup" | "free_credit" | "other" | null;
  balance_after?: number | string | null;
  description?: string | null;
  status?: "pending" | "completed" | "failed" | "reversed";
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
  linkedin_profile: string;
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
  role_name: string;
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
