import { MetadataRoute } from "next";
import { getBlogPosts } from "./common/services/blog";

const BASE_URL = process.env.NEXT_PUBLIC_VERCEL ?? "https://tiaago.com";

async function getAllBlogPostUrls() {
  const posts: { slug: string; updatedAt: string | null }[] = [];
  let page = 1;

  // Walk every page the blog API reports rather than capping arbitrarily --
  // silently truncating a sitemap looks like "covered everything" when it
  // didn't, and Google will just never learn about the missing posts.
  while (true) {
    const res = await getBlogPosts(page).catch(() => null);
    if (!res || !res.results.length) break;
    posts.push(...res.results.map(p => ({ slug: p.slug, updatedAt: p.published_at })));
    if (!res.next) break;
    page += 1;
  }

  return posts;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllBlogPostUrls();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/blogs`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/pricing`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/case-studies`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/contact`, changeFrequency: "monthly", priority: 0.4 },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map(post => ({
    url: `${BASE_URL}/blogs/${post.slug}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes];
}
