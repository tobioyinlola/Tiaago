"use client";
import { useEffect } from "react";
import { useRecruiterStore } from "../store";
import { Recruiter } from "@/app/common/types";

const SetRecruiterProfile = ({ profile }: { profile: Recruiter }) => {
  const setProfile = useRecruiterStore(state => state.setProfile);

  useEffect(() => {
    setProfile(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default SetRecruiterProfile;
