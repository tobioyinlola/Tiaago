import { Metadata } from "next";
import { Suspense } from "react";
import { BASE_URL } from "@/app/common/constants";
import Footer from "@/app/common/components/Layout/Footer";
import { getBlogCategories, getBlogPosts } from "@/app/common/services/blog";

import JsonLd from "./_components/JsonLd";
import CategoryFilter from "./_components/CategoryFilter";
import FeaturedPost from "./_components/FeaturedPost";
import BlogPostCard from "./_components/BlogPostCard";
import BlogPagination from "./_components/Pagination";
import BlogSearchBar from "./_components/BlogSearchBar";

const PAGE_SIZE = 9;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights on hiring, talent acquisition, AI in recruitment, and building remote teams in Africa.",
  // Pagination/category query variants all canonicalize back to the plain
  // /blogs URL -- they're not meant to compete for indexing individually.
  alternates: {
    canonical: `${BASE_URL}/blogs`,
  },
  openGraph: {
    title: "TIAAGO Blog",
    description: "Insights on hiring, talent acquisition, and AI in recruitment.",
    siteName: "TIAAGO",
    type: "website",
    url: `${BASE_URL}/blogs`,
  },
  twitter: {
    card: "summary_large_image",
    title: "TIAAGO Blog",
    description: "Insights on hiring, talent acquisition, and AI in recruitment.",
  },
};

type Props = {
  searchParams: Promise<{ page?: string; category?: string; search?: string }>;
};

const BlogsPage = async ({ searchParams }: Props) => {
  const { page: pageParam, category, search } = await searchParams;
  const page = Number(pageParam) || 1;

  const [postsRes, categories] = await Promise.all([
    getBlogPosts(page, category, search).catch(() => null),
    getBlogCategories(),
  ]);

  const posts = postsRes?.results || [];
  const totalCount = postsRes?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const featuredPost =
    page === 1 && !category && !search ? posts.find(p => p.is_featured) || posts[0] : undefined;
  const gridPosts = featuredPost ? posts.filter(p => p.id !== featuredPost.id) : posts;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "TIAAGO Blog",
    url: `${BASE_URL}/blogs`,
    description:
      "Insights on hiring, talent acquisition, AI in recruitment, and building remote teams in Africa.",
    publisher: {
      "@type": "Organization",
      name: "TIAAGO",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/opengraph-image.png`,
      },
    },
    blogPost: posts.slice(0, 10).map(post => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: `${BASE_URL}/blogs/${post.slug}`,
      datePublished: post.published_at || undefined,
      image: post.featured_image || undefined,
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <main className='pt-24 pb-20'>
        <section className='max-w-3xl mx-auto text-center px-4 mb-14'>
          <span className='text-[11px] font-jetbrains-mono uppercase tracking-widest text-[#5465FF] font-semibold'>
            The Tiaago Blog
          </span>
          <h1 className='text-4xl md:text-5xl font-bold text-gray-900 mt-3 mb-6'>
            Insights on hiring great talent
          </h1>
          <p className='text-lg text-gray-600'>
            Practical advice on recruiting, AI-assisted hiring, and building
            world-class remote teams -- straight from the team at Tiaago.
          </p>
          <Suspense fallback={null}>
            <BlogSearchBar />
          </Suspense>
        </section>

        {!posts.length ? (
          <section className='max-w-2xl mx-auto text-center px-4 py-20'>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              {search ? "No matching posts" : "No posts yet"}
            </h2>
            <p className='text-gray-600'>
              {search
                ? "Try a different search term."
                : "We're working on our first stories. Check back soon."}
            </p>
          </section>
        ) : (
          <div className='max-w-6xl mx-auto px-4 flex flex-col gap-12'>
            {featuredPost && (
              <section>
                <span className='block text-[11px] font-jetbrains-mono uppercase tracking-widest text-[#5465FF] font-semibold mb-4'>
                  Featured Article
                </span>
                <FeaturedPost post={featuredPost} />
              </section>
            )}

            <section>
              <span className='block text-[11px] font-jetbrains-mono uppercase tracking-widest text-[#5465FF] font-semibold mb-4'>
                All Articles
              </span>
              <Suspense fallback={null}>
                <CategoryFilter categories={categories} />
              </Suspense>

              {!!gridPosts.length && (
                <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8'>
                  {gridPosts.map(post => (
                    <BlogPostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </section>

            <BlogPagination current={page} totalPages={totalPages} category={category} />
          </div>
        )}
      </main>
      <Footer noBorder />
    </>
  );
};

export default BlogsPage;
