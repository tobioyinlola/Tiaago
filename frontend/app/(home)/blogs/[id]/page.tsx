import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";

import { BASE_URL } from "@/app/common/constants";
import Footer from "@/app/common/components/Layout/Footer";
import { getBlogPost, getBlogPosts } from "@/app/common/services/blog";

import JsonLd from "../_components/JsonLd";
import PostContent from "../_components/PostContent";
import BlogPostCard from "../_components/BlogPostCard";
import { formatBlogDate, getInitials } from "../utils";

// NOTE: this route segment is named `[id]` (not `[slug]`) because Next.js
// doesn't allow two differently-named dynamic segments at the same path
// level, and an older static blog route already claimed `[id]` here. The
// param value is a post's slug, not a numeric id -- only the folder/param
// name is `id` for that historical reason.
type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Blog" };

  const description = post.excerpt || post.title;

  return {
    title: post.title,
    description,
    alternates: {
      canonical: `${BASE_URL}/blogs/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description,
      siteName: "TIAAGO",
      type: "article",
      url: `${BASE_URL}/blogs/${post.slug}`,
      publishedTime: post.published_at || undefined,
      authors: post.author?.name ? [post.author.name] : undefined,
      images: post.featured_image ? [{ url: post.featured_image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: post.featured_image ? [post.featured_image] : undefined,
    },
  };
}

const BlogPostPage = async ({ params }: Props) => {
  const { id: slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return notFound();

  const relatedRes = post.category
    ? await getBlogPosts(1, post.category.slug).catch(() => null)
    : null;
  const relatedPosts = (relatedRes?.results || []).filter(p => p.slug !== post.slug).slice(0, 3);

  const postUrl = `${BASE_URL}/blogs/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.featured_image ? [post.featured_image] : undefined,
    datePublished: post.published_at || undefined,
    dateModified: post.published_at || undefined,
    author: {
      "@type": "Person",
      name: post.author?.name || "Tiaago",
    },
    publisher: {
      "@type": "Organization",
      name: "TIAAGO",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/opengraph-image.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
    articleSection: post.category?.name || undefined,
    url: postUrl,
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <main className='pt-24 pb-20'>
        <article className='max-w-3xl mx-auto px-4'>
          <Link
            href='/blogs'
            className='inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#5465FF] transition-colors duration-200 mb-8'
          >
            <ArrowLeft className='h-4 w-4' /> Back to blog
          </Link>

          {post.category && (
            <Link
              href={`/blogs?category=${post.category.slug}`}
              className='inline-block bg-[#5465FF]/10 text-[#5465FF] text-xs font-semibold px-3 py-1 rounded-full mb-4'
            >
              {post.category.name}
            </Link>
          )}

          <h1 className='text-3xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight'>
            {post.title}
          </h1>

          <div className='flex items-center gap-4 text-sm text-gray-500 mb-10 pb-8 border-b border-gray-100'>
            <div className='flex items-center gap-2'>
              <div className='h-9 w-9 rounded-full bg-[#5465FF]/10 text-[#5465FF] flex items-center justify-center text-xs font-semibold overflow-hidden'>
                {post.author?.avatar ? (
                  <Image
                    src={post.author.avatar}
                    alt={post.author.name}
                    width={36}
                    height={36}
                    className='object-cover w-full h-full'
                  />
                ) : (
                  getInitials(post.author?.name)
                )}
              </div>
              <span className='font-medium text-gray-700'>
                {post.author?.name || "Tiaago"}
                {post.author?.title && <span className='text-gray-400 font-normal'>, {post.author.title}</span>}
              </span>
            </div>
            <span>{formatBlogDate(post.published_at)}</span>
            <span className='flex items-center gap-1'>
              <Clock className='h-3.5 w-3.5' /> {post.reading_time_minutes} min read
            </span>
          </div>
        </article>

        {post.featured_image && (
          <div className='max-w-4xl mx-auto px-4 mb-12'>
            <div className='relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100'>
              <Image
                src={post.featured_image}
                alt={post.title}
                fill
                priority
                sizes='(max-width: 1024px) 100vw, 1024px'
                className='object-cover'
              />
            </div>
          </div>
        )}

        <article className='max-w-3xl mx-auto px-4'>
          <PostContent html={post.content} />
        </article>

        {!!relatedPosts.length && (
          <section className='max-w-6xl mx-auto px-4 mt-20 pt-12 border-t border-gray-100'>
            <h2 className='text-2xl font-bold text-gray-900 mb-8'>More in {post.category?.name}</h2>
            <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
              {relatedPosts.map(related => (
                <BlogPostCard key={related.id} post={related} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
};

export default BlogPostPage;
