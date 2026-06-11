import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";

import { StatusPill } from "@/components/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ArticleStatus, SeoArticle } from "@/lib/database.types";
import { ARTICLE_STATUSES, ARTICLE_STATUS_CLASSES } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { ArticleFilters } from "./article-filters";

export const metadata = { title: "SEO Articles" };

type ArticleListRow = SeoArticle & {
  client: { name: string } | null;
  engagement: { id: string; name: string } | null;
};

interface SeoArticlesPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function SeoArticlesPage({
  searchParams,
}: SeoArticlesPageProps) {
  const params = await searchParams;
  const { org } = await getOrgContext();
  const supabase = await createClient();

  let query = supabase
    .from("seo_articles")
    .select("*, client:clients(name), engagement:engagements(id, name)")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });

  if (params.status && (ARTICLE_STATUSES as string[]).includes(params.status)) {
    query = query.eq("status", params.status as ArticleStatus);
  }

  const { data: rows } = await query;
  const articles = (rows ?? []) as unknown as ArticleListRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SEO Articles</h1>
          <p className="text-sm text-muted-foreground">
            Your content library across all clients and engagements.
          </p>
        </div>
        <Button asChild>
          <Link href="/seo-articles/new">
            <Plus className="h-4 w-4" />
            New article
          </Link>
        </Button>
      </div>

      <ArticleFilters />

      {articles.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No articles match.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead>Keywords</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Words</TableHead>
              <TableHead>Published</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.map((article: ArticleListRow) => (
              <TableRow key={article.id}>
                <TableCell>
                  <Link
                    href={`/seo-articles/${article.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {article.title}
                  </Link>
                  {article.published_url ? (
                    <a
                      href={article.published_url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 inline-block align-middle text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {article.client?.name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {article.engagement?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex max-w-56 flex-wrap gap-1">
                    {article.target_keywords
                      .slice(0, 3)
                      .map((keyword: string) => (
                        <Badge
                          key={keyword}
                          variant="secondary"
                          className="font-normal"
                        >
                          {keyword}
                        </Badge>
                      ))}
                    {article.target_keywords.length > 3 ? (
                      <Badge variant="outline" className="font-normal">
                        +{article.target_keywords.length - 3}
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusPill
                    label={article.status}
                    className={ARTICLE_STATUS_CLASSES[article.status]}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {article.word_count > 0
                    ? article.word_count.toLocaleString()
                    : "—"}
                </TableCell>
                <TableCell>{formatDate(article.published_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
