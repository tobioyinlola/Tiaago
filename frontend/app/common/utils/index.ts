import { toast } from "sonner";
import { HTTPError } from "ky";
import { twMerge } from "tailwind-merge";
import { differenceInDays } from "date-fns";
import ky from "ky";
import { clsx, type ClassValue } from "clsx";

import { Alert } from "../store/useAlert";
import {
  BasePageProps,
  CompanySkillAssessment,
  Job,
  User,
} from "../types";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const isNullOrUndef = (v: unknown): v is null | undefined =>
  v === null || v === undefined;

export const altFromImgUrl = (url: string) =>
  url.split("/").pop()?.split(".").pop() || url;

export const htmlToPlainText = (html = "") =>
  html
    .replace(/<[^>]+>/g, " ")
    .trim()
    .replaceAll("&nbsp;", "\n");

export const toId = (value: string) => value.toLowerCase().replace(/\s/g, "-");

export const getFullUserType = (
  type: User["user_type"]
): NonNullable<BasePageProps["as"]> => {
  switch (type) {
    case "T":
      return "talent";
    case "CR":
      return "recruiter";
    case "ST":
      return "staff";
  }
};

export const asToUserType = (
  as: NonNullable<BasePageProps["as"]>
): User["user_type"] => {
  switch (as) {
    case "talent":
      return "T";
    case "recruiter":
      return "CR";
    case "staff":
      return "ST";
  }
};

// URL path segment for each role -- NOT a blind pluralization: "talent" is
// plural ("talents") but "recruiter" is intentionally kept singular, so
// every route-building call site must go through this instead of `${as}s`.
export const getRoleUrlSegment = (
  as: NonNullable<BasePageProps["as"]>
): string => {
  switch (as) {
    case "talent":
      return "talents";
    case "recruiter":
      return "recruiter";
    case "staff":
      return "admin";
  }
};

export const getPeriodText = (no_of_days: number) => {
  if (no_of_days === 30) return "/month";
  if (no_of_days === 365) return "/year";
  return `/${no_of_days} days`;
};

export const jobTypeEnumToLabel = (jobType: Job["job_type"]) => {
  switch (jobType) {
    case "FT":
      return "Full Time";
    case "PT":
      return "Part Time";
    case "CW":
      return "Contract";
    case "IN":
      return "Internship";
    default:
      return jobType;
  }
};

export const jobSalaryTypeToLabel = (salaryType: Job["salary_duration"]) => {
  switch (salaryType) {
    case "PH":
      return "Per hour";
    case "PM":
      return "Per month";
    case "CT":
      return "Contract";
    default:
      return salaryType;
  }
};

export const isBasicUser = (user: User) =>
  user.subscribed_plan?.plan.toLowerCase().includes("basic");

export const isProUser = (user: User) =>
  user.subscribed_plan?.plan.toLowerCase().includes("premium");

export const formatPrice = ({
  price,
  currencyCode,
  languageCode,
  divisor = 1,
  noOfDigits = 2,
  makeFriendly,
}: {
  price: number;
  currencyCode?: string | null;
  languageCode?: string | null;
  divisor?: number;
  noOfDigits?: number;
  makeFriendly?: boolean;
}): string => {
  const _currencyCode = currencyCode ?? "NGN";
  let _languageCode = languageCode ?? "en-NG";
  if (_currencyCode === "NGN") _languageCode = "en-NG";
  if (_currencyCode === "USD") _languageCode = "en-US";
  return new Intl.NumberFormat(_languageCode, {
    style: "currency",
    currency: _currencyCode,
    minimumFractionDigits: noOfDigits,
    maximumFractionDigits: noOfDigits,
    notation: makeFriendly ? "compact" : undefined,
    compactDisplay: makeFriendly ? "long" : undefined,
  }).format(price / divisor);
};

export const handlePlural = (
  count: number,
  text: string,
  _pluralText?: string
) => {
  const pluralText = _pluralText ?? text + "s";
  return count !== 1 ? pluralText : text;
};

export const optimizeCount = (count: number) => (count >= 100 ? "99+" : count);

export const getOnboardingUrl = (as?: BasePageProps["as"]) => {
  if (as === "staff") return "/admin/signin";
  if (as) return `/${getRoleUrlSegment(as)}/signin`;
  return "/onboarding";
};

export const getDashboardUrl = (type?: User["user_type"]) => {
  if (type === "ST") return "/admin";
  if (type) return `/${getRoleUrlSegment(getFullUserType(type))}/dashboard`;
  return "";
};

export const isValueOrClose = (a: number, b: number, range = 1) =>
  Math.abs(a - b) <= range;

export const showUpgradePlanModal = () =>
  (
    document.getElementById("nav-upgrade-plan-modal") as HTMLDialogElement
  )?.showModal();

export const closeModal = (id: string) =>
  (document.getElementById(id) as HTMLDialogElement)?.close();

export const openModal = (id: string) =>
  (document.getElementById(id) as HTMLDialogElement)?.showModal();

export const toggleModal = (id: string) => {
  const modal = document.getElementById(id) as HTMLDialogElement;
  if (!modal) return;
  if (modal.open) modal.close();
  else modal.showModal();
};

export const toggleCreateContractModal = () => {
  const modal = document.getElementById(
    "create-contract-modal"
  ) as HTMLDialogElement;
  if (!modal) return;
  if (modal.open) modal.close();
  else modal.showModal();
};

export const uppercaseFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const formatErrorMessage = (
  errMsg: string,
  fallbackError = "An unexpected error occurred. Please try again or contact support."
) => {
  const _message =
    errMsg.includes("status code 500") || errMsg.includes("Server Error (500)")
      ? fallbackError
      : errMsg.includes("timeout")
      ? "Slow server response please check your network connection or try again after a few minutes"
      : errMsg;
  const message = _message ? _message : fallbackError;
  // handle html strings
  let htmlStrippedMessage = message;
  if (message.trim().startsWith("<")) {
    console.log("html message:");
    console.log(JSON.stringify(message));
    htmlStrippedMessage = htmlToPlainText(message);
    // console.log("html stripped message:");
    // console.log(htmlStrippedMessage);
  }
  // truncate message to 200 characters with optional ellipsis
  const truncated = uppercaseFirstLetter(htmlStrippedMessage.slice(0, 200));
  return truncated + (htmlStrippedMessage.length > 200 ? "..." : "");
};

type ErrorMap = Record<
  string,
  string | string[] | Record<string, string | string[]>
>;

const getErrorMessage = (
  error: string | string[] | Record<string, string | string[]>
): string => {
  if (typeof error === "string") return error;
  if (Array.isArray(error)) return error[0];
  console.log("typeof error:", typeof error);
  if (!error)
    return "An unexpected error occurred. Please try again or contact support.";
  return getErrorMessage(Object.values(error)[0]);
};

export const handleFormSubmissionError = async (
  error: any,
  setFieldError?: (key: string, message?: string) => void,
  setAlert?: (alert: Alert) => void,
  showToast?: boolean
): Promise<string> => {
  "use client";
  toast.dismiss();
  if (error instanceof HTTPError) {
    let errorMap: ErrorMap = {};
    const text = await error.response?.text();
    if (text) {
      try {
        errorMap = JSON.parse(text);
      } catch (e) {
        errorMap = {
          detail: htmlToPlainText(text),
        };
      }
    }
    let errorMsg: string = formatErrorMessage(error.message);
    const getErrMsg = (errMap = errorMap) => {
      Object.entries(errMap).forEach(([key, value], i) => {
        const err = getErrorMessage(value);
        if (typeof err === "object" && !Array.isArray(err)) {
          getErrMsg(err);
          return;
        }
        const _value = getErrorMessage(err)?.trim();
        const _key = key.replaceAll("_", " ");
        const message = formatErrorMessage(_value);
        if (i === 0 && message) {
          const showKey =
            !["detail", "non_field_errors"].includes(key) &&
            _key &&
            _key != "0";
          const _errorMsg = showKey
            ? `${key.replaceAll("_", " ")}: ${message}`
            : message;
          errorMsg = formatErrorMessage(_errorMsg);
        }
        setFieldError?.(key, message);
      });
    };
    getErrMsg();
    if (setAlert)
      setAlert({ message: errorMsg, icon: "error", title: "An error occured" });
    else if (showToast)
      toast.error(errorMsg, { important: true, duration: 120000 });
    return errorMsg;
  } else {
    const errorMsg = typeof error === "string" ? error : error?.message;
    const message = formatErrorMessage(errorMsg);
    if (setAlert)
      setAlert({ message, icon: "error", title: "An error occured" });
    else if (showToast)
      toast.error(message, {
        important: true,
        duration: 120000,
      });
    return message;
  }
};

export const _handleServerApiCallError = async (
  error: any
): Promise<[string, ErrorMap]> => {
  if (error instanceof HTTPError) {
    let errorMap: ErrorMap = {};
    const text = await error.response?.text();
    try {
      errorMap = JSON.parse(text);
    } catch (e) {
      console.log("error parsing response text:");
      console.log(text);
      errorMap = {
        detail: htmlToPlainText(text),
      };
    }
    let errorMsg: string = formatErrorMessage(error.message);
    const getErrMsg = (errMap = errorMap) => {
      if (typeof errMap === "string") {
        errorMsg = formatErrorMessage(errMap);
        errorMap = {
          detail: errorMsg,
        };
        return;
      }
      Object.entries(errMap).forEach(([key, value], i) => {
        const err = getErrorMessage(value);
        if (typeof err === "object" && !Array.isArray(err)) {
          getErrMsg(err);
          return;
        }
        const _value = getErrorMessage(err)?.trim();
        const _key = key.replaceAll("_", " ");
        const message = formatErrorMessage(_value);
        if (i === 0 && message) {
          const showKey =
            !["detail", "non_field_errors"].includes(key) &&
            _key &&
            _key != "0";
          const _errorMsg = showKey
            ? `${key.replaceAll("_", " ")}: ${message}`
            : message;
          errorMsg = formatErrorMessage(_errorMsg);
        }
      });
    };
    getErrMsg();
    return [errorMsg, errorMap];
  } else {
    const errorMsg = typeof error === "string" ? error : error?.message;
    const message = formatErrorMessage(errorMsg);
    return [message, {}];
  }
};

export const handleServerApiCallError = async (error: any) => {
  const [message] = await _handleServerApiCallError(error);
  return message;
};

export const isRecentJob = (input: Job | Job["date_created"]) => {
  const dateCreated = typeof input === "string" ? input : input.date_created;
  const diff = differenceInDays(new Date(), new Date(dateCreated));
  const isRecent = diff <= 3;
  return isRecent;
};

export const getUserCountry = async (currentUser?: User | null) => {
  const country = currentUser?.country
    ? currentUser.country
    : await ky
        .get("/api/country")
        .json<{ country?: string }>()
        .then(data => data?.country ?? "Nigeria");
  return country;
};

export const getMetricPercentageChange = (
  current: number,
  previous: number
) => {
  if (current === 0 && previous === 0) return 0.0;
  if (previous === 0) return 100.0;
  const change = current - previous;
  return +((change / previous || 0) * 100).toFixed(1);
};

export const getNoOfMCQQuestions = (assessment: CompanySkillAssessment) =>
  assessment.sections.reduce((acc, section) => {
    if (section.type === "MCQ") {
      return (
        acc + (section.question_count ?? 0) ||
        section.mcq_questions?.length ||
        0
      );
    }
    return acc;
  }, 0);

export const getNoOfCodingTasks = (assessment: CompanySkillAssessment) =>
  assessment.sections.reduce((acc, section) => {
    if (section.type === "CODING_TASK") {
      return (
        acc +
        (section.question_count || section.coding_tasks?.length || 0 ? 1 : 0)
      );
    }
    return acc;
  }, 0);

export const getNoOfAssementQuestions = (assessment: CompanySkillAssessment) =>
  getNoOfMCQQuestions(assessment) + getNoOfCodingTasks(assessment);

export const getAssessmentDifficultyLevel = (difficultyLevel: string) => {
  switch ((difficultyLevel || "").toLowerCase()) {
    case "beginner":
      return "Junior";
    case "intermediate":
      return "Intermediate";
    case "advanced":
      return "Senior";
    default:
      return capitalize((difficultyLevel || "").toLowerCase()) || "Junior";
  }
};

export const getAssessmentDurationInMinutes = (
  assessment: CompanySkillAssessment,
  codingTask?: boolean
) => {
  return assessment.duration_minutes ?? (codingTask ? 30 : 15);
};

export const closeDropdown = () => {
  document
    .getElementById("dropdown-close-helper")
    ?.focus({ preventScroll: true });
};

export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Parses a Python-style list string (with single quotes) into a JavaScript array
 * Handles strings like: "['item1', 'item2', 'item3']"
 */
export const parsePythonListString = (str: string): string[] => {
  if (!str || typeof str !== "string") return [];

  try {
    // First try to parse as JSON (in case it's already valid JSON)
    return JSON.parse(str);
  } catch {
    // If that fails, try to parse as Python-style list
    try {
      // Replace single quotes with double quotes to make it valid JSON
      const jsonString = str.replace(/'/g, '"');
      return JSON.parse(jsonString);
    } catch {
      // If all else fails, return empty array
      console.warn("Failed to parse list string:", str);
      return [];
    }
  }
};

export const fromSlug = (str: string) => str.split("_").join(" ");
