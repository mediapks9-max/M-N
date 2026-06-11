import type {
  FinancialMode,
  InvoiceDirection,
  InvoiceStatus,
} from "@/lib/database.types";
import { FINANCIAL_INVOICE_STATUSES } from "@/lib/domain";

export interface InvoiceFinancialRow {
  engagement_id: string | null;
  direction: InvoiceDirection;
  status: InvoiceStatus;
  total: number;
}

export interface EngagementFinancials {
  revenue: number;
  cost: number;
  profit: number;
  mode: FinancialMode;
}

/**
 * 'auto' mode: revenue = linked outbound invoices, cost = linked inbound
 * invoices (statuses sent/paid/overdue — drafts and cancelled excluded).
 * 'manual' mode: the engagement's manual fields override.
 */
export function computeEngagementFinancials(
  engagement: {
    id: string;
    financial_mode: FinancialMode;
    manual_revenue: number | null;
    manual_cost: number | null;
  },
  invoices: InvoiceFinancialRow[]
): EngagementFinancials {
  if (engagement.financial_mode === "manual") {
    const revenue = engagement.manual_revenue ?? 0;
    const cost = engagement.manual_cost ?? 0;
    return { revenue, cost, profit: revenue - cost, mode: "manual" };
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
