"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

const BlogSearchBar = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("search") || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const category = searchParams.get("category");
    if (category) params.set("category", category);
    if (value.trim()) params.set("search", value.trim());
    router.push(`/blogs${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <form onSubmit={handleSubmit} className='relative max-w-md mx-auto mt-8'>
      <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
      <input
        type='search'
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder='Search articles'
        className='w-full pl-11 pr-4 py-3 rounded-full border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5465FF]/30 focus:border-[#5465FF] transition-colors duration-200'
      />
    </form>
  );
};

export default BlogSearchBar;
