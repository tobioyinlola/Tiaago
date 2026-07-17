"use server";
import Mixpanel from "mixpanel";
import { ID, SubscriptionPlan } from "../types";

const { MIXPANEL_TOKEN, NODE_ENV } = process.env;
const isProd = false; // NODE_ENV === "production";

if (!MIXPANEL_TOKEN && isProd) {
  throw new Error("MIXPANEL_TOKEN is not defined");
}

type UserType = "recruiter" | "talent";

const mixpanel = isProd ? Mixpanel.init(MIXPANEL_TOKEN!) : null;

export const mixpanelTrack = async (
  eventName: string,
  properties: Record<string, any>
) => {
  mixpanel?.track(eventName, properties, error => {
    if (error) {
      console.log(`Error tracking event: ${eventName}`, error);
    }
  });
};
type BaseSignupEventInput = {
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  country?: string;
  user_type: UserType;
  role?: string;
};

type TalentSignupEventInput = BaseSignupEventInput & {
  gender?: string;
  user_type: "talent";
  portfolio?: string;
  experience_level?: string;
};

type RecruiterSignupEventInput = BaseSignupEventInput & {
  user_type: "recruiter";
  company_name?: string;
  company_email?: string;
  // size and website are collected post-signup in the onboarding cards
  size?: string;
  address?: string;
  website?: string;
};

export type SignupEventInput = TalentSignupEventInput | RecruiterSignupEventInput;

export const mixpanelTrackSignup = async (
  input: SignupEventInput,
  { ip, ...extraProperties }: Record<string, any> = {}
) => {
  mixpanel?.track("Signup", { ...input, ...extraProperties }, error => {
    if (error) {
      console.log("Error tracking signup event", error);
    }
  });
  const { first_name, last_name, email, phone_number, ...rest } = input;
  mixpanel?.people.set(
    email,
    {
      $first_name: first_name,
      $last_name: last_name,
      $phone: phone_number,
      $email: email,
      ...rest,
    },
    ip ? { $ip: ip } : undefined,
    error => {
      if (error) {
        console.log("Error setting people properties in signup event", error);
      }
    }
  );
};

export type SubscriptionEventInput = SubscriptionPlan & {
  user_id: ID;
};

export const mixpanelTrackSubscription = async (
  input: SubscriptionEventInput,
  { ip, ...extraProperties }: Record<string, any> = {}
) => {
  mixpanel?.track("Subscription", input, error => {
    if (error) {
      console.log("Error tracking subscription event", error);
    }
  });
  mixpanel?.people.track_charge(
    String(input.user_id),
    input.amount,
    {
      $ip: ip,
      ...input,
      ...extraProperties,
    },
    error => {
      if (error) {
        console.log("Error tracking charge in subscription event", error);
      }
    }
  );
  mixpanel?.people.set(
    String(input.user_id),
    {
      subscription_plan: input.name,
    },
    error => {
      if (error) {
        console.log(
          "Error setting subscription plan in people properties (subscription event)",
          error
        );
      }
    }
  );
};
