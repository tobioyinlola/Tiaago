import axios from "axios";
import UAParser from "ua-parser-js";
import { v4 as uuidv4 } from "uuid";

import {
  mixpanelTrack,
  mixpanelTrackSignup,
  mixpanelTrackSubscription,
  SignupEventInput,
  SubscriptionEventInput,
} from "../actions/mixpanel.actions";
import { User } from "../types";

const getLocationData = async () => {
  const { data } = await axios.get("/api/country", {
    params: {
      fields: "country,regionName,city",
    },
  });
  return data as {
    country?: string;
    regionName?: string;
    city?: string;
    ip?: string;
  };
};

const getDefaultProperties = async () => {
  const locationData = await getLocationData();
  const urlParams = new URLSearchParams(window.location.search);
  const utmParams = {
    utm_source: urlParams.get("utm_source") || undefined,
    utm_medium: urlParams.get("utm_medium") || undefined,
    utm_campaign: urlParams.get("utm_campaign") || undefined,
    utm_term: urlParams.get("utm_term") || undefined,
    utm_content: urlParams.get("utm_content") || undefined,
    id: urlParams.get("id") || undefined,
  };

  const device_id = localStorage.getItem("device_id") || uuidv4();
  localStorage.setItem("device_id", device_id);

  const parser = new UAParser();
  const { browser, device, os } = parser.getResult();

  return {
    $browser: navigator.userAgent,
    $browser_version: browser.version,
    $city: locationData.city,
    $region: locationData.regionName,
    mp_country_code: locationData.country,
    $current_url: window.location.href,
    $device: device.type,
    $device_vendor: device.vendor,
    $device_model: device.model,
    $device_id: device_id,
    $initial_referrer: document.referrer ? document.referrer : undefined,
    $initial_referring_domain: document.referrer
      ? new URL(document.referrer).hostname
      : undefined,
    $os: os.name,
    $os_version: os.version,
    $screen_height: window.screen.height,
    $screen_width: window.screen.width,
    ip: locationData.ip,
    ...utmParams,
  };
};

export const trackPageView = async (path: string, user?: User) => {
  const defaultProperties = await getDefaultProperties();
  mixpanelTrack("Page View", {
    page_viewed: path,
    ...defaultProperties,
    ...(user?.email ? { distinct_id: user.email, $user_id: user.email } : {}),
  });
};

export const trackSignup = async (input: SignupEventInput) => {
  const defaultProperties = await getDefaultProperties();
  mixpanelTrackSignup(input, defaultProperties);
};

export const trackSubscription = async (input: SubscriptionEventInput) => {
  const defaultProperties = await getDefaultProperties();
  mixpanelTrackSubscription(input, defaultProperties);
};

export const trackSubscriptionRequest = async (
  input: SubscriptionEventInput
) => {
  const defaultProperties = await getDefaultProperties();
  mixpanelTrack("Subscription Request", {
    ...input,
    ...defaultProperties,
  });
};
