"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EngagementMetric } from "@/lib/database.types";
import {
  METRIC_FIELD_LABELS,
  PERFORMANCE_PRICING_MODELS,
  type MetricField,
} from "@/lib/domain";
import {
  metricEarnedRevenue,
  metricPayout,
  performanceTotals,
  type MetricPerformanceRow,
  type PerformancePricing,
} from "@/lib/finance";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { addMetricAction, deleteMetricAction, type MetricInput } from "../actions";

interface MetricsSectionProps {
  orgId: string;
  engagementId: string;
  engagementName: string;
  metrics: EngagementMetric[];
  /** Fields relevant to this engagement's service + pricing model. */
  fields: MetricField[];
  pricing: PerformancePricing;
  currency: string;
  supplierId: string | null;
  supplierName: string | null;
}

const EMPTY_VALUES: Record<MetricField, string> = {
  spend: "",
  impressions: "",
  clicks: "",
  leads: "",
  approved_leads: "",
  conversions: "",
  sessions: "",
  organic_traffic: "",
  revenue_generated: "",
};

export function MetricsSection({
  orgId,
  engagementId,
  engagementName,
  metrics,
  fields,
  pricing,
  currency,
  supplierId,
  supplierName,
}: MetricsSectionProps) {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [values, setValues] = useState<Record<MetricField, string>>(EMPTY_VALUES);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const isPerformance = PERFORMANCE_PRICING_MODELS.includes(
    pricing.pricing_model
  );
  const performanceRows: MetricPerformanceRow[] = metrics.map(
    (metric: EngagementMetric): MetricPerformanceRow => ({
      engagement_id: metric.engagement_id,
      leads: metric.leads,
      approved_leads: metric.approved_leads,
      conversions: metric.conversions,
      clicks: metric.clicks,
      revenue_generated: metric.revenue_generated,
      spend: metric.spend,
    })
  );
  const totals = performanceTotals(pricing, performanceRows);
  const hasPayout = supplierId !== null && (pricing.payout_percent ?? 0) > 0;

  const payoutInvoiceHref = hasPayout
    ? `/invoices/new?engagement=${engagementId}&direction=inbound&client=${supplierId}&amount=${totals.payout.toFixed(2)}&description=${encodeURIComponent(
        `Publisher payout — ${engagementName} (${pricing.payout_percent}% of earned revenue)`
      )}`
    : null;

  function parse(field: MetricField): number | null {
    return values[field] ? Number.parseFloat(values[field]) : null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: MetricInput = {
      period_start: periodStart,
      period_end: periodEnd,
      spend: parse("spend"),
      impressions: parse("impressions"),
      clicks: parse("clicks"),
      leads: parse("leads"),
      approved_leads: parse("approved_leads"),
      conversions: parse("conversions"),
      sessions: parse("sessions"),
      organic_traffic: parse("organic_traffic"),
      revenue_generated: parse("revenue_generated"),
      notes,
    };
    startTransition(async () => {
      const result = await addMetricAction(
        orgId,
        engagementId,
        engagementName,
        input
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Metrics entry added.");
        setPeriodStart("");
        setPeriodEnd("");
        setValues(EMPTY_VALUES);
        setNotes("");
      }
    });
  }

  function handleDelete(metric: EngagementMetric) {
    startTransition(async () => {
      const result = await deleteMetricAction(
        orgId,
        engagementId,
        metric.id,
        `${engagementName} (${metric.period_start})`
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Metrics entry removed.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {isPerformance ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Earned revenue</p>
            <p className="text-xl font-bold">
              {formatCurrency(totals.earned, currency)}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">
              Supplier payout
              {supplierName ? ` (${supplierName})` : ""}
            </p>
            <p className="text-xl font-bold">
              {formatCurrency(totals.payout, currency)}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Media spend</p>
            <p className="text-xl font-bold">
              {formatCurrency(totals.spend, currency)}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Margin</p>
            <p
              className={`text-xl font-bold ${totals.margin < 0 ? "text-red-600" : ""}`}
            >
              {formatCurrency(totals.margin, currency)}
            </p>
          </div>
        </div>
      ) : null}

      {payoutInvoiceHref && totals.payout > 0 ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link href={payoutInvoiceHref}>
              <Receipt className="h-3.5 w-3.5" />
              Create payout invoice ({formatCurrency(totals.payout, currency)})
            </Link>
          </Button>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Add period</CardTitle>
          <CardDescription>
            Manual KPI entry for a reporting period. Showing the fields
            relevant to this engagement&apos;s service and pricing model.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mStart">Period start</Label>
                <Input
                  id="mStart"
                  type="date"
                  required
                  value={periodStart}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPeriodStart(e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mEnd">Period end</Label>
                <Input
                  id="mEnd"
                  type="date"
                  required
                  value={periodEnd}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPeriodEnd(e.target.value)
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {fields.map((field: MetricField) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={`m-${field}`}>
                    {METRIC_FIELD_LABELS[field]}
                  </Label>
                  <Input
                    id={`m-${field}`}
                    type="number"
                    step="any"
                    min="0"
                    value={values[field]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setValues({ ...values, [field]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mNotes">Notes</Label>
              <Input
                id="mNotes"
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNotes(e.target.value)
                }
              />
            </div>
            <Button type="submit" disabled={isPending}>
              <Plus className="h-4 w-4" />
              {isPending ? "Adding…" : "Add entry"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {metrics.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No metrics yet. Add your first reporting period above.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              {fields.map((field: MetricField) => (
                <TableHead key={field} className="text-right">
                  {METRIC_FIELD_LABELS[field]}
                </TableHead>
              ))}
              {isPerformance ? (
                <>
                  <TableHead className="text-right">Earned</TableHead>
                  {hasPayout ? (
                    <TableHead className="text-right">Payout</TableHead>
                  ) : null}
                </>
              ) : null}
              <TableHead>Notes</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((metric: EngagementMetric, index: number) => (
              <TableRow key={metric.id}>
                <TableCell className="whitespace-nowrap font-medium">
                  {formatDate(metric.period_start)} –{" "}
                  {formatDate(metric.period_end)}
                </TableCell>
                {fields.map((field: MetricField) => (
                  <TableCell key={field} className="text-right">
                    {formatNumber(metric[field])}
                  </TableCell>
                ))}
                {isPerformance ? (
                  <>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(
                        metricEarnedRevenue(pricing, performanceRows[index]),
                        currency
                      )}
                    </TableCell>
                    {hasPayout ? (
                      <TableCell className="text-right">
                        {formatCurrency(
                          metricPayout(pricing, performanceRows[index]),
                          currency
                        )}
                      </TableCell>
                    ) : null}
                  </>
                ) : null}
                <TableCell className="max-w-48 truncate text-muted-foreground">
                  {metric.notes || "—"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isPending}
                    onClick={() => handleDelete(metric)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
