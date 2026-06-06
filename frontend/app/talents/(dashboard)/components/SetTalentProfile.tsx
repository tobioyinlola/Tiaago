"use client";

import { useEffect } from "react";
import { Talent, TalentPortfolio } from "@/app/common/types";

import { useTalentStore } from "../store";
import { useAlert } from "@/app/common/store/useAlert";
import { usePathname } from "next/navigation";

const PROFILE_ALERT_KEY = "profile-completion-alert-shown";

const SetTalentProfile = ({
  profile,
  portfolio,
  isVerified,
}: {
  profile: Talent;
  portfolio?: TalentPortfolio;
  isVerified?: boolean;
}) => {
  const pathname = usePathname();
  const [setProfile, setPortfolio] = useTalentStore(s => [
    s.setProfile,
    s.setPortfolio,
  ]);
  const setAlert = useAlert(s => s.setAlert);

  const isInTalentsDashboard = pathname.startsWith("/talents/");
  const isInTalentsSettings = pathname.startsWith("/talents/settings");

  useEffect(() => {
    setProfile(profile);
    if (portfolio) setPortfolio(portfolio);

    // console.log({
    //   isVerified,
    //   alertShown: localStorage.getItem(PROFILE_ALERT_KEY),
    //   hasBio: !!profile?.bio,
    // });

    // Show one-time alert if account is verified and alert hasn't been shown
    if (
      // isVerified &&
      isInTalentsDashboard &&
      !isInTalentsSettings &&
      !localStorage.getItem(PROFILE_ALERT_KEY) &&
      !profile?.bio
    ) {
      setAlert({
        title: "Complete Your Profile",
        message:
          "Please complete your profile for better visibility with recruiters.",
        icon: "info",
        buttonText: "Complete Profile",
        buttonLink: "/talents/settings",
      });
      localStorage.setItem(PROFILE_ALERT_KEY, "true");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
};

export default SetTalentProfile;
