"use client";

import { createContext, useContext } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { Staff } from "@/app/common/types";

type AdminStore = {
  profile: Staff | null;
  setProfile: (profile: Staff) => void;
};

export const createAdminStore = (profile: Staff | null) => createStore<AdminStore>(set => ({
  profile,
  setProfile: profile => set({ profile }),
}));

export const AdminStoreContext = createContext<ReturnType<typeof createAdminStore> | null>(null);
// Shared navigation also renders outside the admin layout. It has no staff
// identity there; keep its fallback read-only and free of request data.
const anonymousStore = createStore<AdminStore>(() => ({ profile: null, setProfile: () => {} }));

export function useAdminStore<T>(selector: (state: AdminStore) => T): T {
  const store = useContext(AdminStoreContext) ?? anonymousStore;
  return useStore(store, selector);
}
