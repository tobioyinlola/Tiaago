"use client";
import { useEffect } from "react";
import { useAdminStore } from "../store";
import { Staff } from "@/app/common/types";

const SetAdminProfile = ({ profile }: { profile: Staff }) => {
  const setProfile = useAdminStore(state => state.setProfile);

  useEffect(() => {
    setProfile(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default SetAdminProfile;
