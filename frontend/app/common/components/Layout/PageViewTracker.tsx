"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useUserStore } from "../../store/useUser";
import { trackPageView } from "../../services/mixpanel.services";

const PageViewTracker = () => {
  const pathname = usePathname();
  const user = useUserStore(state => state.profile);

  useEffect(() => {
    const trackPageViewAsync = async () => {
      try {
        await trackPageView(pathname, user || undefined);
      } catch (error) {
        if (process.env.NODE_ENV === "development") console.error(error);
      }
    };
    if (process.env.NODE_ENV === "production" && pathname) trackPageViewAsync();
  }, [pathname, user]);

  return null;
};

export default PageViewTracker;
