"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import { AdminStoreContext, createAdminStore } from "../store";
import { Staff } from "@/app/common/types";

const AdminStoreProvider = ({ profile, children }: PropsWithChildren<{ profile: Staff }>) => {
  // Each admin tree owns its store. Initial permissions match on the server
  // and browser, including segments that hydrate after the layout's effects.
  const [store] = useState(() => createAdminStore(profile));
  useEffect(() => store.getState().setProfile(profile), [profile, store]);
  return <AdminStoreContext.Provider value={store}>{children}</AdminStoreContext.Provider>;
};

export default AdminStoreProvider;
