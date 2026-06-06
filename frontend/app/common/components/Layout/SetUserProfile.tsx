"use client";
import { useEffect } from "react";

import { User } from "@/app/common/types";
import { useUserStore } from "../../store/useUser";
import { removeAuthCookies as removeAuthCookiesAction } from "../../actions";

const SetUserProfile = ({
  profile,
  removeAuthCookies,
}: {
  profile: User;
  removeAuthCookies: boolean;
}) => {
  const setProfile = useUserStore(state => state.setProfile);

  useEffect(() => {
    setProfile(profile);
    const onRemoveAuthCookies = async () => {
      try {
        await removeAuthCookiesAction();
      } catch (error) {
        console.error(error);
      }
    };
    if (removeAuthCookies) onRemoveAuthCookies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default SetUserProfile;
