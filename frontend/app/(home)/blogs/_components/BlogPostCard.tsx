import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";

import { BlogPostSummary } from "@/app/common/types";
import { formatBlogDate, getInitials } from "../utils";

const BlogPostCard = ({ post }: { post: BlogPostSummary }) => {
  return (
    <Link
      href={`/blogs/${post.slug}`}
      className='group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col'
    >
      <div className='relative w-full aspect-[16/10] overflow-hidden bg-gray-100'>
        {post.featured_image ? (
          <Image
            src={post.featured_image}
            alt={post.title}
            fill
            sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            className='object-cover transition-transform duration-500 group-hover:scale-105'
          />
        ) : (
          <div className='w-full h-full bg-gradient-to-br from-[#5465FF]/10 to-[#5465FF]/30' />
        )}
        {post.category && (
          <span className='absolute top-3 left-3 bg-white/95 backdrop-blur text-[#5465FF] text-xs font-semibold px-3 py-1 rounded-full'>
            {post.category.name}
          </span>
        )}
      </div>

      <div className='p-6 flex flex-col flex-1'>
        <h3 className='text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#5465FF] transition-colors duration-200'>
          {post.title}
        </h3>
        <p className='text-sm text-gray-600 line-clamp-3 mb-4 flex-1'>{post.excerpt}</p>

        <div className='flex items-center justify-between pt-4 border-t border-gray-100 text-xs text-gray-500'>
          <div className='flex items-center gap-2'>
            <div className='h-6 w-6 rounded-full bg-[#5465FF]/10 text-[#5465FF] flex items-center justify-center text-[10px] font-semibold overflow-hidden'>
              {post.author?.avatar ? (
                <Image
                  src={post.author.avatar}
                  alt={post.author.name}
                  width={24}
                  height={24}
                  className='object-cover w-full h-full'
                />
              ) : (
                getInitials(post.author?.name)
              )}
            </div>
            <span className='font-medium text-gray-700'>{post.author?.name || "Tiaago"}</span>
          </div>
          <div className='flex items-center gap-3'>
            <span>{formatBlogDate(post.published_at)}</span>
            <span className='flex items-center gap-1'>
              <Clock className='h-3 w-3' /> {post.reading_time_minutes} min
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default BlogPostCard;
