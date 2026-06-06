"use client";

import { toast } from "sonner";
import { useEffect, PropsWithChildren } from "react";

const TakeQuizContainer = ({ children }: PropsWithChildren) => {
  useEffect(() => {
    const duration = 600000;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is not visible (user switched to another tab, app, or minimized the browser)
        toast.warning("You left the page :(", { duration });
      }
    };
    const handleBlur = () => {
      toast.warning("You are on another app :(", { duration });
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return children;
};

export default TakeQuizContainer;
