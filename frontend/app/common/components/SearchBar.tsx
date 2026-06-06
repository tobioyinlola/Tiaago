"use client";

import { FiSearch } from "react-icons/fi";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEventHandler, Suspense, useEffect } from "react";

import { cn } from "../utils";
import { useSearch } from "../store/useSearch";

type SearchBarProps = {
  className?: string;
  placeholder?: string;
  inputClass?: string;
  searchKey?: string;
  querySearch?: boolean;
  queryKey?: string;
};

const SearchBarContent = ({
  className = "",
  placeholder = "Search...",
  inputClass = "",
  searchKey = "search",
  querySearch = false,
  queryKey = "q",
}: SearchBarProps) => {
  const router = useRouter();
  const { searchText, setSearchText } = useSearch();
  const searchParams = useSearchParams();
  const onSubmit: FormEventHandler = e => {
    e.preventDefault();
    if (querySearch) {
      const _searchParams = new URLSearchParams(searchParams);
      _searchParams.set(queryKey, searchText[searchKey] ?? "");
      router.push(`?${_searchParams.toString()}`);
    }
  };

  useEffect(() => {
    if (querySearch) {
      setSearchText(searchParams.get(queryKey) ?? "", searchKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [querySearch, queryKey, searchKey]);

  return (
    <form onSubmit={onSubmit} className={cn("relative", className)}>
      <button
        type='submit'
        className='absolute right-3 top-1/2 -translate-y-1/2'
      >
        <FiSearch className='text-gray-500 text-xl' aria-hidden />
      </button>
      <input
        type='text'
        name='text'
        placeholder={placeholder}
        className={cn("input input-bordered pl-10 w-full text-xs", inputClass)}
        value={searchText[searchKey] ?? ""}
        onChange={e => setSearchText(e.target.value, searchKey)}
      />
    </form>
  );
};

const SearchBar = (props: SearchBarProps) => (
  <Suspense>
    <SearchBarContent {...props} />
  </Suspense>
);

export default SearchBar;
