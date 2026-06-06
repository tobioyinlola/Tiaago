import { DependencyList, useEffect } from "react";

const useScroll = (
  elementId?: string | null,
  callback = () => {},
  deps: DependencyList = []
) => {
  useEffect(() => {
    const _callback = callback;
    const isClient = typeof window !== "undefined";
    if (isClient) {
      const element = document.getElementById(elementId ?? "");
      const dom = element ?? document.documentElement;
      dom.addEventListener("scroll", _callback);
      return () => {
        dom.removeEventListener("scroll", _callback);
      };
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

export default useScroll;
