"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiSearch } from "react-icons/fi";

type AssessmentSearchProps = {
  defaultSearchText?: string;
  searchParams?: Readonly<Record<string, string | string[] | undefined>>;
};

const AssessmentSearch = ({
  defaultSearchText,
  searchParams,
}: AssessmentSearchProps) => {
  const router = useRouter();
  const [searchText, setSearchText] = useState(defaultSearchText ?? "");

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const _searchParams = new URLSearchParams(searchParams as any);
    _searchParams.set("q", searchText);
    _searchParams.set("page", "1");
    router.push(`/talents/assessments?${_searchParams.toString()}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className='flex items-center justify-end w-full font-dm-sans mb-6'
    >
      <div className='relative flex-[0.8] md:flex-[0.45]'>
        <FiSearch
          className='absolute left-3 top-1/2 -translate-y-1/2 text-[#14141480] text-2xl'
          aria-hidden
        />
        <input
          type='text'
          placeholder='What skill are you looking to assess?'
          className='input input-bordered pl-12 w-full text-base rounded-r-none placeholder:text-[#14141480] focus:outline-none bg-white dark:bg-white'
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </div>
      <button
        type='submit'
        className='btn btn-primary text-base flex-[0.2] md:flex-[0.1] rounded-l-none font-medium'
      >
        Search
      </button>
    </form>
  );
};

export default AssessmentSearch;
