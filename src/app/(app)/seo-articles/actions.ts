"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import type { ArticleStatus } from "@/lib/database.types";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Unique public slug for /blog/[slug]; stable once assigned. */
async function uniqueArticleSlug(
  supabase: SupabaseServerClient,
  orgId: string,
  title: string,
  excludeId?: string
): Promise<string> {
  let base = slugify(title);
  if (base === "item") {
    base = "article";
  }
  const { data: rows } = await supabase
    .from("seo_articles")
    .select("id, slug")
    .eq("organization_id", orgId);
  const taken = new Set(
    (rows ?? [])
      .filter((row: { id: string }) => row.id !== excludeId)
      .map((row: { slug: string }) => row.slug)
  );
  let slug = base;
  let n = 1;
  while (taken.has(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export interface ActionResult {
  error?: string;
  articleId?: string;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return { supabase, user };
}

export interface ArticleInput {
  title: string;
  engagement_id: string | null;
  client_id: string | null;
  target_keywords: string[];
  status: ArticleStatus;
  published_url: string;
  content: string;
}

function countWords(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export async function createArticleAction(
  orgId: string,
  input: ArticleInput
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  if (!input.title.trim()) {
    return { error: "Title is required." };
  }

  const slug = await uniqueArticleSlug(supabase, orgId, input.title);

  const { data: article, error } = await supabase
    .from("seo_articles")
    .insert({
      organization_id: orgId,
      title: input.title.trim(),
      slug,
      engagement_id: input.engagement_id,
      client_id: input.client_id,
      target_keywords: input.target_keywords,
      status: input.status,
      published_url: input.published_url.trim(),
      published_at:
        input.status === "published" ? new Date().toISOString() : null,
      word_count: countWords(input.content),
      content: input.content,
    })
    .select("id, title")
    .single();

  if (error || !article) {
    return { error: error?.message ?? "Could not create the article." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "article",
    entityId: article.id,
    entityLabel: article.title,
    action: "created",
  });

  revalidatePath("/seo-articles");
  return { articleId: article.id };
}

export async function updateArticleAction(
  orgId: string,
  articleId: string,
  input: ArticleInput
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  if (!input.title.trim()) {
    return { error: "Title is required." };
  }

  const { data: before } = await supabase
    .from("seo_articles")
    .select("status, published_at, slug")
    .eq("id", articleId)
    .eq("organization_id", orgId)
    .maybeSingle();

  const becamePublished =
    input.status === "published" && before?.status !== "published";

  // Slugs stay stable once assigned (public URLs); only fill gaps.
  const slug =
    before && !before.slug
      ? await uniqueArticleSlug(supabase, orgId, input.title, articleId)
      : undefined;

  const { data, error } = await supabase
    .from("seo_articles")
    .update({
      title: input.title.trim(),
      ...(slug ? { slug } : {}),
      engagement_id: input.engagement_id,
      client_id: input.client_id,
      target_keywords: input.target_keywords,
      status: input.status,
      published_url: input.published_url.trim(),
      published_at: becamePublished
        ? new Date().toISOString()
        : input.status === "published"
          ? (before?.published_at ?? new Date().toISOString())
          : null,
      word_count: countWords(input.content),
      content: input.content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", articleId)
    .eq("organization_id", orgId)
    .select("id, title");

  if (error) {
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Article not found." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "article",
    entityId: articleId,
    entityLabel: data[0].title,
    action: becamePublished ? "published" : "updated",
  });

  revalidatePath("/seo-articles");
  revalidatePath(`/seo-articles/${articleId}`);
  return { articleId };
}

export async function deleteArticleAction(
  orgId: string,
  articleId: string,
  title: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("seo_articles")
    .delete()
    .eq("id", articleId)
    .eq("organization_id", orgId);

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "article",
    entityId: articleId,
    entityLabel: title,
    action: "deleted",
  });

  revalidatePath("/seo-articles");
  redirect("/seo-articles");
}
