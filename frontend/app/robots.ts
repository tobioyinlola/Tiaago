import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_VERCEL ?? "https://tiaago.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Internal staff area -- publicly reachable (has its own login gate)
        // but should never appear in search results.
        disallow: ["/admin"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
