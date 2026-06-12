import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: base,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/blog`,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_articles", {
    org_slug: process.env.NEXT_PUBLIC_SITE_ORG_SLUG ?? "",
  });

  const articleEntries: MetadataRoute.Sitemap = (data ?? []).map(
    (article: { slug: string; published_at: string | null }) => ({
      url: `${base}/blog/${article.slug}`,
      lastModified: article.published_at ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })
  );

  return [...staticEntries, ...articleEntries];
}
