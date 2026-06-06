"use client";

import { Toaster } from "sonner";
import { PropsWithChildren } from "react";
import { domAnimation, LazyMotion } from "framer-motion";

import CustomAlert from "./CustomAlert";
import PageViewTracker from "./PageViewTracker";

const Providers = ({ children }: PropsWithChildren) => {
  return (
    <LazyMotion strict features={domAnimation}>
      {children}
      <Toaster richColors closeButton />
      <CustomAlert />
      <PageViewTracker />
    </LazyMotion>
  );
};

export default Providers;
