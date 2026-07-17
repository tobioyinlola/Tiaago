"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/app/common/utils";
import { BlogCategory } from "@/app/common/types";

const CategoryFilter = ({ categories }: { categories: BlogCategory[] }) => {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  return (
    <div className='flex flex-wrap items-center justify-center gap-2'>
      <Link
        href='/blogs'
        scroll={false}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-medium border transition-colors duration-200",
          !activeCategory
            ? "bg-[#5465FF] border-[#5465FF] text-white"
            : "bg-white border-gray-200 text-gray-600 hover:border-[#5465FF] hover:text-[#5465FF]"
        )}
      >
        All Posts
      </Link>
      {categories.map(category => (
        <Link
          key={category.id}
          href={`/blogs?category=${category.slug}`}
          scroll={false}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium border transition-colors duration-200",
            activeCategory === category.slug
              ? "bg-[#5465FF] border-[#5465FF] text-white"
              : "bg-white border-gray-200 text-gray-600 hover:border-[#5465FF] hover:text-[#5465FF]"
          )}
        >
          {category.name}
          <span
            className={cn(
              "ml-1.5 text-xs",
              activeCategory === category.slug ? "text-white/70" : "text-gray-400"
            )}
          >
            {category.post_count}
          </span>
        </Link>
      ))}
    </div>
  );
};

export default CategoryFilter;
