import { create } from "zustand";

import { Staff } from "@/app/common/types";

type AdminStore = {
  profile: Staff | null;
  setProfile: (profile: Staff) => void;
};

export const useAdminStore = create<AdminStore>(set => ({
  profile: null,
  setProfile: profile => set({ profile }),
}));
