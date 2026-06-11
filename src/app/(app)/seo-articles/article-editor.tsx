"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ArticleStatus, SeoArticle } from "@/lib/database.types";
import { ARTICLE_STATUSES } from "@/lib/domain";
import {
  createArticleAction,
  deleteArticleAction,
  updateArticleAction,
  type ArticleInput,
} from "./actions";

export interface SelectOption {
  id: string;
  name: string;
}

export interface EngagementOption extends SelectOption {
  client_id: string;
}

interface ArticleEditorProps {
  orgId: string;
  clients: SelectOption[];
  engagements: EngagementOption[];
  article?: SeoArticle;
  preselectedEngagementId?: string;
}

const NONE = "none";

export function ArticleEditor({
  orgId,
  clients,
  engagements,
  article,
  preselectedEngagementId,
}: ArticleEditorProps) {
  const router = useRouter();
  const preselectedEngagement = engagements.find(
    (e: EngagementOption) => e.id === preselectedEngagementId
  );

  const [title, setTitle] = useState(article?.title ?? "");
  const [clientId, setClientId] = useState(
    article?.client_id ?? preselectedEngagement?.client_id ?? NONE
  );
  const [engagementId, setEngagementId] = useState(
    article?.engagement_id ?? preselectedEngagement?.id ?? NONE
  );
  const [keywordsInput, setKeywordsInput] = useState(
    article?.target_keywords.join(", ") ?? ""
  );
  const [status, setStatus] = useState<ArticleStatus>(
    article?.status ?? "idea"
  );
  const [publishedUrl, setPublishedUrl] = useState(
    article?.published_url ?? ""
  );
  const [content, setContent] = useState(article?.content ?? "");
  const [showPreview, setShowPreview] = useState(false);
  const [isPending, startTransition] = useTransition();

  const keywords = useMemo(
    () =>
      keywordsInput
        .split(",")
        .map((keyword: string) => keyword.trim())
        .filter(Boolean),
    [keywordsInput]
  );

  const wordCount = useMemo(
    () => content.trim().split(/\s+/).filter(Boolean).length,
    [content]
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: ArticleInput = {
      title,
      engagement_id: engagementId === NONE ? null : engagementId,
      client_id: clientId === NONE ? null : clientId,
      target_keywords: keywords,
      status,
      published_url: publishedUrl,
      content,
    };
    startTransition(async () => {
      const result = article
        ? await updateArticleAction(orgId, article.id, input)
        : await createArticleAction(orgId, input);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(article ? "Article saved." : "Article created.");
        if (!article) {
          router.push(`/seo-articles/${result.articleId}`);
        }
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!article) return;
    if (!window.confirm(`Delete "${article.title}"? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteArticleAction(orgId, article.id, article.title);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Article details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="artTitle">Title</Label>
            <Input
              id="artTitle"
              required
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTitle(e.target.value)
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={clientId}
                onValueChange={(value: string) => {
                  setClientId(value);
                  setEngagementId(NONE);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {clients.map((client: SelectOption) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Engagement</Label>
              <Select
                value={engagementId}
                onValueChange={(value: string) => setEngagementId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {engagements
                    .filter(
                      (engagement: EngagementOption) =>
                        clientId === NONE ||
                        engagement.client_id === clientId
                    )
                    .map((engagement: EngagementOption) => (
                      <SelectItem key={engagement.id} value={engagement.id}>
                        {engagement.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value: string) =>
                  setStatus(value as ArticleStatus)
                }
              >
                <SelectTrigger className="capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARTICLE_STATUSES.map((s: ArticleStatus) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="artKeywords">
              Target keywords (comma separated)
            </Label>
            <Input
              id="artKeywords"
              placeholder="seo audit, technical seo, hong kong"
              value={keywordsInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setKeywordsInput(e.target.value)
              }
            />
            {keywords.length > 0 ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {keywords.map((keyword: string) => (
                  <Badge
                    key={keyword}
                    variant="secondary"
                    className="font-normal"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
          {status === "published" ? (
            <div className="space-y-2">
              <Label htmlFor="artUrl">Published URL</Label>
              <Input
                id="artUrl"
                type="url"
                placeholder="https://"
                value={publishedUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPublishedUrl(e.target.value)
                }
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>
            Content{" "}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {wordCount.toLocaleString()} words
            </span>
          </CardTitle>
          <div className="flex gap-1">
            <Button
              type="button"
              variant={showPreview ? "ghost" : "secondary"}
              size="sm"
              onClick={() => setShowPreview(false)}
            >
              Write
            </Button>
            <Button
              type="button"
              variant={showPreview ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowPreview(true)}
            >
              Preview
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showPreview ? (
            <div className="prose-sm min-h-[400px] max-w-none rounded-md border p-4 [&_a]:underline [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-3 [&_ul]:list-disc">
              {content.trim() ? (
                <ReactMarkdown>{content}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground">Nothing to preview yet.</p>
              )}
            </div>
          ) : (
            <Textarea
              className="min-h-[400px] font-mono text-sm"
              placeholder="Write the article in Markdown…"
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setContent(e.target.value)
              }
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        {article ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={handleDelete}
          >
            Delete article
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : article ? "Save article" : "Create article"}
        </Button>
      </div>
    </form>
  );
}
