import { create } from "zustand";

type SearchStore = {
  searchText: Record<string, string>;
  setSearchText: (searchText: string, key: string) => void;
};

export const useSearch = create<SearchStore>(set => ({
  searchText: {},
  setSearchText: (searchText, key) =>
    set(prev => ({
      searchText: {
        ...prev.searchText,
        [key]: searchText,
      },
    })),
}));
