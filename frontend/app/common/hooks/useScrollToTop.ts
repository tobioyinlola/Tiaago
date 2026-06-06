import { useCallback } from "react";

export const useScrollToTop = (scrollAreaId?: string) => {
  const scrollToTop = useCallback(() => {
    const element = document.getElementById(scrollAreaId ?? "") ?? window;
    element.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [scrollAreaId]);

  return scrollToTop;
};
