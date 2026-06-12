import Link from "next/link";

import { LeadForm } from "@/components/site/lead-form";
import { SiteHeader } from "@/components/site/site-header";
import { SiteTracker } from "@/components/site/site-tracker";
import { branding } from "@/lib/branding";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Blog",
  description:
    "Guides and insights on SEO, performance marketing and agency operations.",
};

interface PublicArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  published_at: string | null;
  word_count: number;
}

export default async function BlogPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_articles", {
    org_slug: process.env.NEXT_PUBLIC_SITE_ORG_SLUG ?? "",
  });
  const articles = (data ?? []) as PublicArticle[];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteTracker />
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
        <p className="mt-2 text-muted-foreground">
          Guides and insights on SEO, performance marketing and agency
          operations.
        </p>

        {articles.length === 0 ? (
          <p className="mt-12 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No published articles yet — check back soon.
          </p>
        ) : (
          <div className="mt-10 space-y-10">
            {articles.map((article: PublicArticle) => (
              <article key={article.id}>
                <p className="text-xs text-muted-foreground">
                  {formatDate(article.published_at)}
                  {article.word_count > 0
                    ? ` · ${Math.max(1, Math.round(article.word_count / 200))} min read`
                    : ""}
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  <Link
                    href={`/blog/${article.slug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {article.title}
                  </Link>
                </h2>
                {article.excerpt ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {article.excerpt}…
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}

        <div className="mt-16">
          <LeadForm
            title="Want results like these?"
            description="Tell us about your project — we'll reply within one business day."
          />
        </div>
      </main>

      <footer className="border-t py-6">
        <p className="text-center text-sm text-muted-foreground">
          {branding.productName}
        </p>
      </footer>
    </div>
  );
}
