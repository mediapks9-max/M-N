import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { ServiceBadge } from "@/components/service-badge";
import { StatusPill } from "@/components/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  Deliverable,
  Engagement,
  EngagementMetric,
  Invoice,
  SeoArticle,
} from "@/lib/database.types";
import {
  ARTICLE_STATUS_CLASSES,
  ENGAGEMENT_STATUS_CLASSES,
  INVOICE_STATUS_CLASSES,
  metricFieldsForService,
} from "@/lib/domain";
import {
  computeEngagementFinancials,
  type InvoiceFinancialRow,
} from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/format";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { DeliverablesSection } from "./deliverables-section";
import { MetricsSection } from "./metrics-section";
import { OverviewForm } from "./overview-form";

export const metadata = { title: "Engagement" };

const TABS = [
  "overview",
  "metrics",
  "deliverables",
  "invoices",
  "articles",
] as const;
type Tab = (typeof TABS)[number];

type EngagementDetail = Engagement & {
  client: { id: string; name: string } | null;
  service: { id: string; name: string; color: string; slug: string } | null;
};

interface EngagementPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function EngagementPage({
  params,
  searchParams,
}: EngagementPageProps) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? "")
    ? (tabParam as Tab)
    : "overview";

  const { org } = await getOrgContext();
  const supabase = await createClient();

  const { data: engagementRow } = await supabase
    .from("engagements")
    .select(
      "*, client:clients(id, name), service:services(id, name, color, slug)"
    )
    .eq("id", id)
    .eq("organization_id", org.id)
    .maybeSingle();

  if (!engagementRow) {
    notFound();
  }
  const engagement = engagementRow as unknown as EngagementDetail;

  const [
    { data: metrics },
    { data: deliverables },
    { data: invoices },
    { data: articles },
    { data: clients },
    { data: services },
  ] = await Promise.all([
    supabase
      .from("engagement_metrics")
      .select("*")
      .eq("engagement_id", id)
      .eq("organization_id", org.id)
      .order("period_start", { ascending: false }),
    supabase
      .from("deliverables")
      .select("*")
      .eq("engagement_id", id)
      .eq("organization_id", org.id)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("invoices")
      .select("*")
      .eq("engagement_id", id)
      .eq("organization_id", org.id)
      .order("issue_date", { ascending: false }),
    supabase
      .from("seo_articles")
      .select("*")
      .eq("engagement_id", id)
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("clients")
      .select("id, name")
      .eq("organization_id", org.id)
      .order("name"),
    supabase
      .from("services")
      .select("id, name")
      .eq("organization_id", org.id)
      .order("sort_order"),
  ]);

  const financials = computeEngagementFinancials(
    engagement,
    ((invoices ?? []) as Invoice[]).map(
      (invoice: Invoice): InvoiceFinancialRow => ({
        engagement_id: invoice.engagement_id,
        direction: invoice.direction,
        status: invoice.status,
        total: invoice.total,
      })
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {engagement.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{engagement.client?.name}</span>
            {engagement.service ? (
              <ServiceBadge
                name={engagement.service.name}
                color={engagement.service.color}
              />
            ) : null}
            <StatusPill
              label={engagement.status}
              className={ENGAGEMENT_STATUS_CLASSES[engagement.status]}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-right">
          <div>
            <p className="text-xs text-muted-foreground">
              Revenue{" "}
              <Badge variant="outline" className="ml-1 text-[10px]">
                {financials.mode === "auto" ? "computed" : "manual"}
              </Badge>
            </p>
            <p className="font-semibold">
              {formatCurrency(financials.revenue, engagement.budget_currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cost</p>
            <p className="font-semibold">
              {formatCurrency(financials.cost, engagement.budget_currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Profit</p>
            <p
              className={cn(
                "font-semibold",
                financials.profit < 0 && "text-red-600"
              )}
            >
              {formatCurrency(financials.profit, engagement.budget_currency)}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex gap-1 border-b">
        {TABS.map((t: Tab) => (
          <Link
            key={t}
            href={`/engagements/${id}?tab=${t}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors",
              t === tab
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? (
        <OverviewForm
          orgId={org.id}
          engagement={engagement}
          clients={clients ?? []}
          services={services ?? []}
        />
      ) : null}

      {tab === "metrics" ? (
        <MetricsSection
          orgId={org.id}
          engagementId={id}
          engagementName={engagement.name}
          metrics={(metrics ?? []) as EngagementMetric[]}
          fields={metricFieldsForService(engagement.service?.slug ?? "")}
        />
      ) : null}

      {tab === "deliverables" ? (
        <DeliverablesSection
          orgId={org.id}
          engagementId={id}
          deliverables={(deliverables ?? []) as Deliverable[]}
        />
      ) : null}

      {tab === "invoices" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button asChild>
              <Link href={`/invoices/new?engagement=${id}`}>
                <Plus className="h-4 w-4" />
                Create invoice
              </Link>
            </Button>
          </div>
          {(invoices ?? []).length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No invoices linked to this engagement yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {((invoices ?? []) as Invoice[]).map((invoice: Invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {invoice.number}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">
                      {invoice.direction}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        label={invoice.status}
                        className={INVOICE_STATUS_CLASSES[invoice.status]}
                      />
                    </TableCell>
                    <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                    <TableCell>{formatDate(invoice.due_date)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ) : null}

      {tab === "articles" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button asChild>
              <Link href={`/seo-articles/new?engagement=${id}`}>
                <Plus className="h-4 w-4" />
                New article
              </Link>
            </Button>
          </div>
          {(articles ?? []).length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No SEO articles linked to this engagement yet.
            </p>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked articles</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Keywords</TableHead>
                      <TableHead>Published</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((articles ?? []) as SeoArticle[]).map(
                      (article: SeoArticle) => (
                        <TableRow key={article.id}>
                          <TableCell>
                            <Link
                              href={`/seo-articles/${article.id}`}
                              className="font-medium underline-offset-4 hover:underline"
                            >
                              {article.title}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <StatusPill
                              label={article.status}
                              className={ARTICLE_STATUS_CLASSES[article.status]}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex max-w-64 flex-wrap gap-1">
                              {article.target_keywords.map(
                                (keyword: string) => (
                                  <Badge
                                    key={keyword}
                                    variant="secondary"
                                    className="font-normal"
                                  >
                                    {keyword}
                                  </Badge>
                                )
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDate(article.published_at)}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
