import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PersistedStore {
  lastVerificationEmailSentAt?: string;
  lastPasswordResetEmailSentAt?: string;
  isSideBarExpanded: boolean;
  setLastVerificationEmailSentAt: (value: string) => void;
  setLastPasswordResetEmailSentAt: (value: string) => void;
  setIsSideBarExpanded: (value: boolean) => void;
  toggleSideBarExpanded: () => void;
}

export const usePersistedStore = create<PersistedStore>()(
  persist(
    set => ({
      lastVerificationEmailSentAt: undefined,
      lastPasswordResetEmailSentAt: undefined,
      isSideBarExpanded: true,
      setLastVerificationEmailSentAt: value =>
        set({ lastVerificationEmailSentAt: value }),
      setLastPasswordResetEmailSentAt: value =>
        set({ lastPasswordResetEmailSentAt: value }),
      setIsSideBarExpanded: value => set({ isSideBarExpanded: value }),
      toggleSideBarExpanded: () =>
        set(prev => ({ isSideBarExpanded: !prev.isSideBarExpanded })),
    }),
    {
      name: "tiaago-persisted-store",
    }
  )
);
