import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { ArticleEditor } from "../article-editor";

export const metadata = { title: "New article" };

interface NewArticlePageProps {
  searchParams: Promise<{ engagement?: string }>;
}

export default async function NewArticlePage({
  searchParams,
}: NewArticlePageProps) {
  const { engagement } = await searchParams;
  const { org } = await getOrgContext();
  const supabase = await createClient();

  const [{ data: clients }, { data: engagements }] = await Promise.all([
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">New article</h1>
      <ArticleEditor
        orgId={org.id}
        clients={clients ?? []}
        engagements={engagements ?? []}
        preselectedEngagementId={engagement}
      />
    </div>
  );
}
