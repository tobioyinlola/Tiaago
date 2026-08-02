import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock } from "lucide-react";

import { BlogPostSummary } from "@/app/common/types";
import { formatBlogDate, getInitials } from "../utils";

const FeaturedPost = ({ post }: { post: BlogPostSummary }) => {
  return (
    <Link
      href={`/blogs/${post.slug}`}
      className='group grid md:grid-cols-2 gap-8 items-center bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden'
    >
      <div className='relative w-full aspect-[16/10] bg-gray-100'>
        {post.featured_image ? (
          <Image
            src={post.featured_image}
            alt={post.title}
            fill
            sizes='(max-width: 768px) 100vw, 50vw'
            priority
            className='object-cover transition-transform duration-500 group-hover:scale-105'
          />
        ) : (
          <div className='w-full h-full bg-gradient-to-br from-[#5465FF]/10 to-[#5465FF]/30' />
        )}
      </div>

      <div className='p-6 md:p-10 md:pl-0'>
        <div className='flex items-center gap-3 mb-4'>
          <span className='text-[11px] font-jetbrains-mono uppercase tracking-widest text-[#5465FF] font-semibold'>
            Latest Article
          </span>
          {post.category && (
            <span className='bg-[#5465FF]/10 text-[#5465FF] text-xs font-semibold px-3 py-1 rounded-full'>
              {post.category.name}
            </span>
          )}
        </div>
        <h2 className='text-2xl md:text-3xl font-bold text-gray-900 mb-3 group-hover:text-[#5465FF] transition-colors duration-200'>
          {post.title}
        </h2>
        <p className='text-gray-600 mb-6 line-clamp-3'>{post.excerpt}</p>

        <div className='flex items-center gap-4 text-sm text-gray-500 mb-6'>
          <div className='flex items-center gap-2'>
            <div className='h-7 w-7 rounded-full bg-[#5465FF]/10 text-[#5465FF] flex items-center justify-center text-[10px] font-semibold overflow-hidden'>
              {post.author?.avatar ? (
                <Image
                  src={post.author.avatar}
                  alt={post.author.name}
                  width={28}
                  height={28}
                  className='object-cover w-full h-full'
                />
              ) : (
                getInitials(post.author?.name)
              )}
            </div>
            <span className='font-medium text-gray-700'>{post.author?.name || "Tiaago"}</span>
          </div>
          <span>{formatBlogDate(post.published_at)}</span>
          <span className='flex items-center gap-1'>
            <Clock className='h-3.5 w-3.5' /> {post.reading_time_minutes} min read
          </span>
        </div>

        <span className='inline-flex items-center gap-2 text-[#5465FF] font-semibold text-sm'>
          Read article <ArrowRight className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-1' />
        </span>
      </div>
    </Link>
  );
};

export default FeaturedPost;
