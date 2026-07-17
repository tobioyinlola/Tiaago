import { create } from "zustand";
import { persist } from "zustand/middleware";

import { Recruiter } from "@/app/common/types";

type RecruiterStore = {
  profile: Recruiter | null;
  setProfile: (profile: Recruiter) => void;
  hasBeenOnboarded: boolean;
  setHasBeenOnboarded: (hasBeenOnboarded: boolean) => void;
  onboardingStep: number;
  setOnboardingStep: (onboardingStep: number) => void;
};

export const useRecruiterStore = create<RecruiterStore>()(
  persist(
    set => ({
      profile: null,
      setProfile: profile => set({ profile }),
      hasBeenOnboarded: false,
      setHasBeenOnboarded: hasBeenOnboarded => set({ hasBeenOnboarded }),
      onboardingStep: 1,
      setOnboardingStep: onboardingStep => set({ onboardingStep }),
    }),
    {
      name: "recruiter-store",
      partialize: state => ({
        hasBeenOnboarded: state.hasBeenOnboarded,
        onboardingStep: state.onboardingStep,
      }),
    }
  )
);
