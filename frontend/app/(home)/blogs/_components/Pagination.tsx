import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const buildHref = (page: number, category?: string) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (category) params.set("category", category);
  return `/blogs?${params.toString()}`;
};

const BlogPagination = ({
  current,
  totalPages,
  category,
}: {
  current: number;
  totalPages: number;
  category?: string;
}) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className='flex items-center justify-center gap-2 mt-4'>
      <Link
        href={buildHref(Math.max(1, current - 1), category)}
        aria-disabled={current === 1}
        className={`h-9 w-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors duration-200 ${
          current === 1 ? "pointer-events-none opacity-40" : "hover:border-[#5465FF] hover:text-[#5465FF]"
        }`}
      >
        <ChevronLeft className='h-4 w-4' />
      </Link>

      {pages.map(page => (
        <Link
          key={page}
          href={buildHref(page, category)}
          className={`h-9 w-9 flex items-center justify-center rounded-full text-sm font-medium transition-colors duration-200 ${
            page === current
              ? "bg-[#5465FF] text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {page}
        </Link>
      ))}

      <Link
        href={buildHref(Math.min(totalPages, current + 1), category)}
        aria-disabled={current === totalPages}
        className={`h-9 w-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors duration-200 ${
          current === totalPages ? "pointer-events-none opacity-40" : "hover:border-[#5465FF] hover:text-[#5465FF]"
        }`}
      >
        <ChevronRight className='h-4 w-4' />
      </Link>
    </div>
  );
};

export default BlogPagination;
