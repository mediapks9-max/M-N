import { notFound } from "next/navigation";

import type { SeoArticle } from "@/lib/database.types";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { ArticleEditor } from "../article-editor";

export const metadata = { title: "Edit article" };

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const { org } = await getOrgContext();
  const supabase = await createClient();

  const [{ data: article }, { data: clients }, { data: engagements }] =
    await Promise.all([
      supabase
        .from("seo_articles")
        .select("*")
        .eq("id", id)
        .eq("organization_id", org.id)
        .maybeSingle(),
      supabase
        .from("clients")
        .select("id, name")
        .eq("organization_id", org.id)
        .order("name"),
      supabase
        .from("engagements")
        .select("id, name, client_id")
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false }),
    ]);

  if (!article) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Edit article</h1>
      <ArticleEditor
        orgId={org.id}
        clients={clients ?? []}
        engagements={engagements ?? []}
        article={article as SeoArticle}
      />
    </div>
  );
}
