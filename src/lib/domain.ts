import type {
  ArticleStatus,
  ClientType,
  DeliverableStatus,
  DeliverableType,
  EngagementStatus,
  InvoiceStatus,
} from "@/lib/database.types";

export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "HKD",
  "ILS",
  "SGD",
  "AUD",
  "CAD",
  "JPY",
  "CNY",
] as const;

export const ENGAGEMENT_STATUSES: EngagementStatus[] = [
  "proposal",
  "active",
  "paused",
  "completed",
  "cancelled",
];

export const ENGAGEMENT_STATUS_CLASSES: Record<EngagementStatus, string> = {
  proposal: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  paused: "bg-slate-200 text-slate-700",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

export const DELIVERABLE_TYPES: DeliverableType[] = [
  "article",
  "audit_report",
  "website",
  "dashboard_report",
  "video",
  "creative",
  "landing_page",
  "other",
];

export const DELIVERABLE_TYPE_LABELS: Record<DeliverableType, string> = {
  article: "Article",
  audit_report: "Audit report",
  website: "Website",
  dashboard_report: "Dashboard report",
  video: "Video",
  creative: "Creative",
  landing_page: "Landing page",
  other: "Other",
};

export const DELIVERABLE_STATUSES: DeliverableStatus[] = [
  "planned",
  "in_progress",
  "review",
  "delivered",
  "published",
];

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  review: "Review",
  delivered: "Delivered",
  published: "Published",
};

export const DELIVERABLE_STATUS_CLASSES: Record<DeliverableStatus, string> = {
  planned: "bg-slate-200 text-slate-700",
  in_progress: "bg-amber-100 text-amber-800",
  review: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  published: "bg-blue-100 text-blue-800",
};

export const ARTICLE_STATUSES: ArticleStatus[] = [
  "idea",
  "draft",
  "review",
  "published",
];

export const ARTICLE_STATUS_CLASSES: Record<ArticleStatus, string> = {
  idea: "bg-slate-200 text-slate-700",
  draft: "bg-amber-100 text-amber-800",
  review: "bg-violet-100 text-violet-800",
  published: "bg-emerald-100 text-emerald-800",
};

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
];

export const INVOICE_STATUS_CLASSES: Record<InvoiceStatus, string> = {
  draft: "bg-slate-200 text-slate-700",
  sent: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-500 line-through",
};

export const CLIENT_TYPES: ClientType[] = ["client", "supplier", "both"];

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  client: "Client",
  supplier: "Supplier",
  both: "Client & supplier",
};

/** Invoice statuses that count toward engagement revenue/cost in 'auto' mode. */
export const FINANCIAL_INVOICE_STATUSES: InvoiceStatus[] = [
  "sent",
  "paid",
  "overdue",
];

export type MetricField =
  | "spend"
  | "impressions"
  | "clicks"
  | "leads"
  | "conversions"
  | "sessions"
  | "organic_traffic"
  | "revenue_generated";

export const METRIC_FIELD_LABELS: Record<MetricField, string> = {
  spend: "Spend",
  impressions: "Impressions",
  clicks: "Clicks",
  leads: "Leads",
  conversions: "Conversions",
  sessions: "Sessions",
  organic_traffic: "Organic traffic",
  revenue_generated: "Revenue generated",
};

export const ALL_METRIC_FIELDS: MetricField[] = [
  "spend",
  "impressions",
  "clicks",
  "leads",
  "conversions",
  "sessions",
  "organic_traffic",
  "revenue_generated",
];

/**
 * Which KPI fields are relevant per service (matched on the seeded slugs).
 * Unknown/custom services show all fields and the user fills what applies.
 */
const METRIC_FIELDS_BY_SERVICE_SLUG: Record<string, MetricField[]> = {
  "traffic-seo": ["sessions", "organic_traffic", "clicks"],
  "paid-campaigns": ["spend", "impressions", "clicks", "leads", "conversions"],
  monetization: ["revenue_generated"],
};

export function metricFieldsForService(serviceSlug: string): MetricField[] {
  return METRIC_FIELDS_BY_SERVICE_SLUG[serviceSlug] ?? ALL_METRIC_FIELDS;
}
