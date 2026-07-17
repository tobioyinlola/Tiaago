import {
  BASIC_RECRUITER_MAX_JOB_POSTS_PER_MONTH,
  FREE_RECRUITER_MAX_JOB_POSTS_PER_MONTH,
  FREE_RECRUITER_MAX_MEETINGS_PER_MONTH,
  FREE_TALENT_MAX_JOB_APPLICATIONS_PER_MONTH,
} from "../constants";
import { BasePageProps, SubscriptionPlan } from "../types";

export const getRecruiterSubPlanBenefits = (plan?: SubscriptionPlan) => {
  switch (plan?.sub_type) {
    case "BS":
      return [
        "All benefits in Free plan",
        BASIC_RECRUITER_MAX_JOB_POSTS_PER_MONTH + " job posts monthly",
        "Unlimited meeting invites",
        "Interview scheduling",
      ];
    case "PR":
      return [
        "All benefits in Basic plan",
        "Unlimited job posts",
        "Priority access to vetted talents",
        "Dedicated account manager",
        "Live 24/7 priority support",
      ];
    default:
      return [
        "Candidate pipeline Management",
        "Access to prescreened talents",
        `${FREE_RECRUITER_MAX_JOB_POSTS_PER_MONTH} job posts monthly (entry level and internship roles)`,
        "Applicant Tracking system",
        `${FREE_RECRUITER_MAX_MEETINGS_PER_MONTH} meeting invites`,
        "Customer support",
      ];
  }
};

export const getTalentSubPlanBenefits = (plan?: SubscriptionPlan) => {
  switch (plan?.sub_type) {
    case "BS":
      return [
        "Access to unlimited job applications (entry level and internship roles)",
      ];
    case "PR":
      return [
        "Access to unlimited job applications (entry level and internship roles)",
        "Access to international jobs of all types once verified",
      ];
    default:
      return [
        `Access to ${FREE_TALENT_MAX_JOB_APPLICATIONS_PER_MONTH} job applications monthly (entry level and internship roles)`,
      ];
  }
};

export const getSubPlanBenefits = (
  as: BasePageProps["as"],
  plan?: SubscriptionPlan
) => {
  switch (as) {
    case "recruiter":
      return getRecruiterSubPlanBenefits(plan);
    case "talent":
      return getTalentSubPlanBenefits(plan);
    default:
      return [];
  }
};
