import { create } from "zustand";
import { persist } from "zustand/middleware";

import { Startup } from "@/app/common/types";

type StartupStore = {
  profile: Startup | null;
  setProfile: (profile: Startup) => void;
  hasBeenOnboarded: boolean;
  setHasBeenOnboarded: (hasBeenOnboarded: boolean) => void;
  onboardingStep: number;
  setOnboardingStep: (onboardingStep: number) => void;
};

export const useStartupStore = create<StartupStore>()(
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
      name: "startup-store",
      partialize: state => ({
        hasBeenOnboarded: state.hasBeenOnboarded,
        onboardingStep: state.onboardingStep,
      }),
    }
  )
);
