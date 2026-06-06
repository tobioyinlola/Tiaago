import { create } from "zustand";

import { User } from "@/app/common/types";

type UserStore = {
  profile: User | null;
  setProfile: (profile: User) => void;
  upgradePlanReason: string;
  setUpgradePlanReason: (reason: string) => void;
};

export const useUserStore = create<UserStore>(set => ({
  profile: null,
  setProfile: profile => set({ profile }),
  upgradePlanReason: "",
  setUpgradePlanReason: reason => set({ upgradePlanReason: reason }),
}));
