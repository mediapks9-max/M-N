import Link from "next/link";
import { Suspense } from "react";

import { ActivityList } from "@/components/activity-list";
import { EntityTypeFilter } from "@/components/entity-type-filter";
import { ServiceBadge } from "@/components/service-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ALL_ENTITY_TYPES,
  type ActivityWithActor,
} from "@/lib/activity-display";
import type {
  ActivityEntityType,
  DeliverableStatus,
  EngagementStatus,
  InvoiceDirection,
  InvoiceStatus,
} from "@/lib/database.types";
import {
  DELIVERABLE_STATUS_LABELS,
  PERFORMANCE_PRICING_MODELS,
} from "@/lib/domain";
import {
  metricEarnedRevenue,
  type MetricPerformanceRow,
  type PerformancePricing,
} from "@/lib/finance";
import { formatCurrency, formatDate, isOverdue } from "@/lib/format";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { LiveSimulator } from "./live-simulator";

export const metadata = { title: "Dashboard" };

interface ServiceRow {
  id: string;
  name: string;
  color: string;
  slug: string;
}

interface EngagementRow extends PerformancePricing {
  id: string;
  name: string;
  status: EngagementStatus;
  client_id: string;
  service_id: string;
  budget_currency: string;
  client: { name: string } | null;
}

interface DeliverableRow {
  id: string;
  title: string;
  status: DeliverableStatus;
  due_date: string | null;
  engagement: { service_id: string } | null;
}

interface InvoiceRow {
  direction: InvoiceDirection;
  status: InvoiceStatus;
  total: number;
  currency: string;
  paid_at: string | null;
}

const MATRIX_STATUSES: EngagementStatus[] = ["proposal", "active", "paused"];

const MATRIX_DOT_CLASSES: Record<EngagementStatus, string> = {
  active: "bg-emerald-500",
  paused: "bg-slate-400",
  proposal: "bg-amber-400",
  completed: "bg-blue-400",
  cancelled: "bg-red-400",
};

const PIPELINE_STATUSES: DeliverableStatus[] = [
  "planned",
  "in_progress",
  "review",
  "delivered",
];

function sumByCurrency(rows: InvoiceRow[]): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const row of rows) {
    sums[row.currency] = (sums[row.currency] ?? 0) + row.total;
  }
  return sums;
}

function CurrencyLines({
  sums,
  negative,
}: {
  sums: Record<string, number>;
  negative?: boolean;
}) {
  const entries = Object.entries(sums);
  if (entries.length === 0) {
    return <p className="text-2xl font-semibold">—</p>;
  }
  return (
    <div className="space-y-0.5">
      {entries.map(([currency, amount]: [string, number]) => (
        <p
          key={currency}
          className={cn(
            "text-2xl font-semibold leading-tight",
            (negative || amount < 0) && "text-red-600"
          )}
        >
          {formatCurrency(amount, currency)}
        </p>
      ))}
    </div>
  );
}

interface DashboardPageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { type } = await searchParams;
  const { org } = await getOrgContext();
  const supabase = await createClient();

  let activityQuery = supabase
    .from("activity_log")
    .select("*, actor:profiles(full_name, email)")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (type && (ALL_ENTITY_TYPES as string[]).includes(type)) {
    activityQuery = activityQuery.eq(
      "entity_type",
      type as ActivityEntityType
    );
  }

  const monthStartDate = new Date();
  const monthStartISO = new Date(
    monthStartDate.getFullYear(),
    monthStartDate.getMonth(),
    1
  )
    .toISOString()
    .slice(0, 10);

  const [
    { data: serviceRows },
    { data: engagementRows },
    { data: deliverableRows },
    { data: invoiceRows },
    { data: activityRows },
    { data: monthMetricRows },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, color, slug")
      .eq("organization_id", org.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("engagements")
      .select(
        "id, name, status, client_id, service_id, budget_currency, pricing_model, unit_rate, rev_share_percent, payout_percent, client:clients!engagements_client_id_organization_id_fkey(name)"
      )
      .eq("organization_id", org.id)
      .in("status", MATRIX_STATUSES),
    supabase
      .from("deliverables")
      .select("id, title, status, due_date, engagement:engagements(service_id)")
      .eq("organization_id", org.id),
    supabase
      .from("invoices")
      .select("direction, status, total, currency, paid_at")
      .eq("organization_id", org.id),
    activityQuery,
    supabase
      .from("engagement_metrics")
      .select(
        "engagement_id, leads, approved_leads, conversions, clicks, revenue_generated, spend"
      )
      .eq("organization_id", org.id)
      .gte("period_start", monthStartISO),
  ]);

  const services = (serviceRows ?? []) as ServiceRow[];
  const engagements = (engagementRows ?? []) as unknown as EngagementRow[];
  const deliverables = (deliverableRows ?? []) as unknown as DeliverableRow[];
  const invoices = (invoiceRows ?? []) as InvoiceRow[];
  const activity = (activityRows ?? []) as unknown as ActivityWithActor[];

  const activeEngagements = engagements.filter(
    (e: EngagementRow) => e.status === "active"
  );

  // --- 1. Activity by service ---------------------------------
  const serviceCards = services.map((service: ServiceRow) => {
    const serviceEngagements = activeEngagements.filter(
      (e: EngagementRow) => e.service_id === service.id
    );
    const clientNames = [
      ...new Set(
        serviceEngagements.map(
          (e: EngagementRow) => e.client?.name ?? "Unknown"
        )
      ),
    ];
    const serviceDeliverables = deliverables.filter(
      (d: DeliverableRow) => d.engagement?.service_id === service.id
    );
    const inProgress = serviceDeliverables.filter(
      (d: DeliverableRow) => d.status === "in_progress"
    ).length;
    const upcoming = serviceDeliverables
      .filter(
        (d: DeliverableRow) =>
          d.due_date &&
          d.status !== "delivered" &&
          d.status !== "published"
      )
      .sort((a: DeliverableRow, b: DeliverableRow) =>
        (a.due_date ?? "").localeCompare(b.due_date ?? "")
      )[0];

    return {
      service,
      engagementCount: serviceEngagements.length,
      clientNames,
      inProgress,
      nextDue: upcoming?.due_date ?? null,
      nextDueOverdue: upcoming ? isOverdue(upcoming.due_date) : false,
    };
  });

  // --- 2. Client × service matrix -----------------------------
  const matrixClients = [
    ...new Map(
      engagements
        .filter((e: EngagementRow) => e.status === "active")
        .map((e: EngagementRow) => [
          e.client_id,
          { id: e.client_id, name: e.client?.name ?? "Unknown" },
        ])
    ).values(),
  ].sort((a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name)
  );

  function matrixCell(clientId: string, serviceId: string) {
    const cellEngagements = engagements.filter(
      (e: EngagementRow) =>
        e.client_id === clientId && e.service_id === serviceId
    );
    if (cellEngagements.length === 0) return null;
    const byPriority: EngagementStatus[] = ["active", "paused", "proposal"];
    const top = byPriority.find((status: EngagementStatus) =>
      cellEngagements.some((e: EngagementRow) => e.status === status)
    );
    return { status: top ?? cellEngagements[0].status, count: cellEngagements.length };
  }

  // --- 3. Deliverables pipeline -------------------------------
  const pipelineCounts = PIPELINE_STATUSES.map(
    (status: DeliverableStatus) => ({
      status,
      count: deliverables.filter((d: DeliverableRow) => d.status === status)
        .length,
    })
  );
  const overdueCount = deliverables.filter(
    (d: DeliverableRow) =>
      isOverdue(d.due_date) &&
      d.status !== "delivered" &&
      d.status !== "published"
  ).length;

  // --- 4. Finance row -----------------------------------------
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  function paidThisMonth(direction: InvoiceDirection): InvoiceRow[] {
    return invoices.filter(
      (invoice: InvoiceRow) =>
        invoice.direction === direction &&
        invoice.status === "paid" &&
        invoice.paid_at !== null &&
        new Date(invoice.paid_at) >= monthStart
    );
  }
  const revenueThisMonth = sumByCurrency(paidThisMonth("outbound"));
  const costsThisMonth = sumByCurrency(paidThisMonth("inbound"));
  const profitThisMonth: Record<string, number> = { ...revenueThisMonth };
  for (const [currency, amount] of Object.entries(costsThisMonth)) {
    profitThisMonth[currency] = (profitThisMonth[currency] ?? 0) - amount;
  }
  const outstanding = sumByCurrency(
    invoices.filter(
      (invoice: InvoiceRow) =>
        invoice.direction === "outbound" &&
        (invoice.status === "sent" || invoice.status === "overdue")
    )
  );

  // Earned-but-not-necessarily-invoiced revenue from performance deals,
  // computed from this month's metrics — this is what moves in live demo.
  const monthMetrics = (monthMetricRows ?? []) as MetricPerformanceRow[];
  const perfEarnedThisMonth: Record<string, number> = {};
  for (const engagement of engagements) {
    if (engagement.status !== "active") continue;
    if (!PERFORMANCE_PRICING_MODELS.includes(engagement.pricing_model)) {
      continue;
    }
    const earned = monthMetrics
      .filter(
        (metric: MetricPerformanceRow) =>
          metric.engagement_id === engagement.id
      )
      .reduce(
        (sum: number, metric: MetricPerformanceRow) =>
          sum + metricEarnedRevenue(engagement, metric),
        0
      );
    if (earned > 0) {
      perfEarnedThisMonth[engagement.budget_currency] =
        (perfEarnedThisMonth[engagement.budget_currency] ?? 0) + earned;
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            What&apos;s running across {org.name}, right now.
          </p>
        </div>
        <LiveSimulator orgId={org.id} />
      </div>

      {/* 1 — Activity by service */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Activity by service
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {serviceCards.map(
            (card: (typeof serviceCards)[number]) => (
              <Link
                key={card.service.id}
                href={`/engagements?service=${card.service.id}&status=active`}
                className={cn(
                  "rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent",
                  card.engagementCount === 0 && "opacity-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <ServiceBadge
                    name={card.service.name}
                    color={card.service.color}
                  />
                  <span className="text-2xl font-bold">
                    {card.engagementCount}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  active engagement{card.engagementCount === 1 ? "" : "s"}
                </p>
                {card.clientNames.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {card.clientNames.slice(0, 4).map((name: string) => (
                      <Badge
                        key={name}
                        variant="secondary"
                        className="font-normal"
                      >
                        {name}
                      </Badge>
                    ))}
                    {card.clientNames.length > 4 ? (
                      <Badge variant="outline" className="font-normal">
                        +{card.clientNames.length - 4}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                  <p>{card.inProgress} deliverable(s) in progress</p>
                  {card.nextDue ? (
                    <p
                      className={cn(
                        card.nextDueOverdue && "font-medium text-red-600"
                      )}
                    >
                      Next due: {formatDate(card.nextDue)}
                      {card.nextDueOverdue ? " (overdue)" : ""}
                    </p>
                  ) : null}
                </div>
              </Link>
            )
          )}
        </div>
      </section>

      {/* 2 — Client × service matrix */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Client × service
        </h2>
        {matrixClients.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No active engagements yet — the matrix fills in as work starts.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-2 text-left font-medium">Client</th>
                  {services.map((service: ServiceRow) => (
                    <th
                      key={service.id}
                      className="px-2 py-2 text-center font-medium"
                    >
                      <span
                        className="mx-auto block h-2 w-2 rounded-full"
                        style={{ backgroundColor: service.color }}
                        title={service.name}
                      />
                      <span className="mt-1 block max-w-20 truncate text-xs font-normal text-muted-foreground">
                        {service.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixClients.map(
                  (client: { id: string; name: string }) => (
                    <tr key={client.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{client.name}</td>
                      {services.map((service: ServiceRow) => {
                        const cell = matrixCell(client.id, service.id);
                        return (
                          <td key={service.id} className="px-2 py-2 text-center">
                            {cell ? (
                              <Link
                                href={`/engagements?client=${client.id}&service=${service.id}`}
                                title={`${cell.count} engagement(s) — ${cell.status}`}
                                className="inline-block"
                              >
                                <span
                                  className={cn(
                                    "inline-block h-3 w-3 rounded-full",
                                    MATRIX_DOT_CLASSES[cell.status]
                                  )}
                                />
                              </Link>
                            ) : (
                              <span className="inline-block h-3 w-3 rounded-full bg-muted" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          <span className="mr-3 inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> active
          </span>
          <span className="mr-3 inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> proposal
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-400" /> paused
          </span>
        </p>
      </section>

      {/* 3 — Deliverables pipeline */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Deliverables pipeline
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {pipelineCounts.map(
            (item: { status: DeliverableStatus; count: number }) => (
              <Link
                key={item.status}
                href={`/deliverables?status=${item.status}`}
                className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent"
              >
                <p className="text-2xl font-bold">{item.count}</p>
                <p className="text-xs text-muted-foreground">
                  {DELIVERABLE_STATUS_LABELS[item.status]}
                </p>
              </Link>
            )
          )}
          <Link
            href="/deliverables"
            className={cn(
              "rounded-xl border p-4 shadow-sm transition-colors hover:bg-accent",
              overdueCount > 0
                ? "border-red-200 bg-red-50"
                : "bg-card"
            )}
          >
            <p
              className={cn(
                "text-2xl font-bold",
                overdueCount > 0 && "text-red-600"
              )}
            >
              {overdueCount}
            </p>
            <p
              className={cn(
                "text-xs",
                overdueCount > 0 ? "text-red-600" : "text-muted-foreground"
              )}
            >
              Overdue
            </p>
          </Link>
        </div>
      </section>

      {/* 4 — Finance row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/reports" className="block">
          <Card className="h-full transition-colors hover:bg-accent">
            <CardHeader className="pb-2">
              <CardDescription>Revenue this month (paid)</CardDescription>
            </CardHeader>
            <CardContent>
              <CurrencyLines sums={revenueThisMonth} />
            </CardContent>
          </Card>
        </Link>
        <Link href="/engagements?status=active" className="block">
          <Card className="h-full transition-colors hover:bg-accent">
            <CardHeader className="pb-2">
              <CardDescription>
                Earned this month (performance)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CurrencyLines sums={perfEarnedThisMonth} />
            </CardContent>
          </Card>
        </Link>
        <Link href="/invoices?direction=outbound&status=sent" className="block">
          <Card className="h-full transition-colors hover:bg-accent">
            <CardHeader className="pb-2">
              <CardDescription>Outstanding (sent + overdue)</CardDescription>
            </CardHeader>
            <CardContent>
              <CurrencyLines sums={outstanding} />
            </CardContent>
          </Card>
        </Link>
        <Link href="/reports" className="block">
          <Card className="h-full transition-colors hover:bg-accent">
            <CardHeader className="pb-2">
              <CardDescription>Profit this month</CardDescription>
            </CardHeader>
            <CardContent>
              <CurrencyLines sums={profitThisMonth} />
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* 5 — Activity feed */}
      <section>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Latest activity</CardTitle>
            <div className="flex items-center gap-3">
              <Suspense>
                <EntityTypeFilter />
              </Suspense>
              <Link
                href="/activity"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ActivityList
              entries={activity}
              emptyMessage="No activity yet — it shows up here as your team works."
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
