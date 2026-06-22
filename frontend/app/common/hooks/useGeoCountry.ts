import { useSyncExternalStore, useCallback } from "react";
import ky from "ky";

let cachedCountry: string | null = null;
let fetched = false;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!fetched) {
    fetched = true;
    ky.get("/api/country", {
        searchParams: { fields: "country" },
      })
      .json<{ country?: string }>()
      .then(data => {
        if (data.country) {
          cachedCountry = data.country;
          listeners.forEach(l => l());
        }
      })
      .catch(() => {});
  }
  return () => listeners.delete(cb);
}

export function useGeoCountry(): string | null {
  const getSnapshot = useCallback(() => cachedCountry, []);
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
