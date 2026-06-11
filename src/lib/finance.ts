import type {
  FinancialMode,
  InvoiceDirection,
  InvoiceStatus,
  PricingModel,
} from "@/lib/database.types";
import { FINANCIAL_INVOICE_STATUSES } from "@/lib/domain";

export interface InvoiceFinancialRow {
  engagement_id: string | null;
  direction: InvoiceDirection;
  status: InvoiceStatus;
  total: number;
}

/** The metric columns performance pricing bills on. */
export interface MetricPerformanceRow {
  engagement_id: string;
  leads: number | null;
  approved_leads: number | null;
  conversions: number | null;
  clicks: number | null;
  revenue_generated: number | null;
  spend: number | null;
}

export interface PerformancePricing {
  pricing_model: PricingModel;
  unit_rate: number | null;
  rev_share_percent: number | null;
  payout_percent: number | null;
}

export interface EngagementFinancials {
  revenue: number;
  cost: number;
  profit: number;
  mode: FinancialMode;
}

/** Revenue earned from a single metrics period under the pricing model. */
export function metricEarnedRevenue(
  pricing: PerformancePricing,
  metric: MetricPerformanceRow
): number {
  switch (pricing.pricing_model) {
    case "cpl":
      return (
        (pricing.unit_rate ?? 0) * (metric.approved_leads ?? metric.leads ?? 0)
      );
    case "cpa":
      return (pricing.unit_rate ?? 0) * (metric.conversions ?? 0);
    case "cpc":
      return (pricing.unit_rate ?? 0) * (metric.clicks ?? 0);
    case "rev_share":
      return (
        ((pricing.rev_share_percent ?? 0) / 100) *
        (metric.revenue_generated ?? 0)
      );
    default:
      return 0;
  }
}

/** Supplier (publisher) share of the earned revenue for one period. */
export function metricPayout(
  pricing: PerformancePricing,
  metric: MetricPerformanceRow
): number {
  return (
    ((pricing.payout_percent ?? 0) / 100) *
    metricEarnedRevenue(pricing, metric)
  );
}

export interface PerformanceTotals {
  earned: number;
  payout: number;
  spend: number;
  margin: number;
}

export function performanceTotals(
  pricing: PerformancePricing,
  metrics: MetricPerformanceRow[]
): PerformanceTotals {
  let earned = 0;
  let payout = 0;
  let spend = 0;
  for (const metric of metrics) {
    earned += metricEarnedRevenue(pricing, metric);
    payout += metricPayout(pricing, metric);
    spend += metric.spend ?? 0;
  }
  return { earned, payout, spend, margin: earned - payout - spend };
}

/**
 * 'auto': revenue/cost from linked invoices (sent/paid/overdue).
 * 'performance': revenue earned from metrics × pricing model; cost =
 *   supplier payout + media spend logged in metrics.
 * 'manual': the engagement's manual fields override everything.
 */
export function computeEngagementFinancials(
  engagement: {
    id: string;
    financial_mode: FinancialMode;
    manual_revenue: number | null;
    manual_cost: number | null;
  } & PerformancePricing,
  invoices: InvoiceFinancialRow[],
  metrics: MetricPerformanceRow[] = []
): EngagementFinancials {
  if (engagement.financial_mode === "manual") {
    const revenue = engagement.manual_revenue ?? 0;
    const cost = engagement.manual_cost ?? 0;
    return { revenue, cost, profit: revenue - cost, mode: "manual" };
  }

  if (engagement.financial_mode === "performance") {
    const totals = performanceTotals(
      engagement,
      metrics.filter(
        (metric: MetricPerformanceRow) =>
          metric.engagement_id === engagement.id
      )
    );
    return {
      revenue: totals.earned,
      cost: totals.payout + totals.spend,
      profit: totals.margin,
      mode: "performance",
    };
  }

  let revenue = 0;
  let cost = 0;
  for (const invoice of invoices) {
    if (invoice.engagement_id !== engagement.id) continue;
    if (!FINANCIAL_INVOICE_STATUSES.includes(invoice.status)) continue;
    if (invoice.direction === "outbound") {
      revenue += invoice.total;
    } else {
      cost += invoice.total;
    }
  }
  return { revenue, cost, profit: revenue - cost, mode: "auto" };
}
