import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { LeadForm } from "@/components/site/lead-form";
import { SiteHeader } from "@/components/site/site-header";
import { SiteTracker } from "@/components/site/site-tracker";
import { branding } from "@/lib/branding";
import { formatDate } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

interface PublicArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  published_at: string | null;
  word_count: number;
}

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

async function fetchArticle(slug: string): Promise<PublicArticle | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_article", {
    org_slug: process.env.NEXT_PUBLIC_SITE_ORG_SLUG ?? "",
    article_slug: slug,
  });
  return ((data ?? []) as PublicArticle[])[0] ?? null;
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) {
    return { title: "Article not found" };
  }
  const description = article.content
    .replace(/[#*`>\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return {
    title: article.title,
    description,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      title: article.title,
      description,
      type: "article",
      publishedTime: article.published_at ?? undefined,
      url: `/blog/${article.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
    },
  };
}

export default async function PublicArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    datePublished: article.published_at ?? undefined,
    wordCount: article.word_count || undefined,
    url: `${siteUrl()}/blog/${article.slug}`,
    publisher: {
      "@type": "Organization",
      name: branding.productName,
      url: siteUrl(),
    },
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteTracker />
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Link
          href="/blog"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← All articles
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          {article.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatDate(article.published_at)}
          {article.word_count > 0
            ? ` · ${Math.max(1, Math.round(article.word_count / 200))} min read`
            : ""}
        </p>

        <div className="mt-8 max-w-none text-[15px] leading-7 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:mb-3 [&_h1]:mt-8 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:space-y-1">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>

        <div className="mt-16">
          <LeadForm
            title="Need help with this?"
            description="We do this for clients every day — tell us about your project."
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
