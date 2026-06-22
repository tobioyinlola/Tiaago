"use client";

import { useEffect } from "react";

import { useUserStore } from "@/app/common/store/useUser";
import { getCurrentUser } from "@/app/common/services/profile";
import { ALLOW_NULL_ARGS } from "@/app/common/constants";
import { removeAuthCookies as removeAuthCookiesAction } from "@/app/common/actions";

const HomeAuthHydrator = () => {
  const setProfile = useUserStore(state => state.setProfile);

  useEffect(() => {
    getCurrentUser(undefined, ALLOW_NULL_ARGS)
      .then(result => {
        if (result?.currentUser) {
          setProfile(result.currentUser);
        }
        if (result?.removeAuthCookies) {
          removeAuthCookiesAction().catch(console.error);
        }
      })
      .catch(() => {});
  }, [setProfile]);

  return null;
};

export default HomeAuthHydrator;
