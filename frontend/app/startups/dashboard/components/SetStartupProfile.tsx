"use client";
import { useEffect } from "react";
import { useStartupStore } from "../store";
import { Startup } from "@/app/common/types";

const SetStartupProfile = ({ profile }: { profile: Startup }) => {
  const setProfile = useStartupStore(state => state.setProfile);

  useEffect(() => {
    setProfile(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default SetStartupProfile;
