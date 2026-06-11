import type {
  ActivityAction,
  ActivityEntityType,
  ActivityLogEntry,
} from "@/lib/database.types";

export type ActivityWithActor = ActivityLogEntry & {
  actor: { full_name: string; email: string } | null;
};

export const ENTITY_TYPE_LABELS: Record<ActivityEntityType, string> = {
  client: "Client",
  engagement: "Engagement",
  deliverable: "Deliverable",
  invoice: "Invoice",
  article: "Article",
  metric: "Metric",
  member: "Member",
  service: "Service",
};

export const ALL_ENTITY_TYPES: ActivityEntityType[] = [
  "client",
  "engagement",
  "deliverable",
  "invoice",
  "article",
  "metric",
  "member",
  "service",
];

const ACTION_VERBS: Record<ActivityAction, string> = {
  created: "created",
  updated: "updated",
  status_changed: "changed the status of",
  paid: "marked as paid",
  published: "published",
  delivered: "marked as delivered",
  deleted: "deleted",
  invited: "invited",
};

export function actorName(entry: ActivityWithActor): string {
  return entry.actor?.full_name || entry.actor?.email || "Someone";
}

/** "created engagement “ACME — SEO retainer”" (actor rendered separately). */
export function describeActivity(entry: ActivityWithActor): string {
  const verb = ACTION_VERBS[entry.action];
  const entityLabel = ENTITY_TYPE_LABELS[entry.entity_type].toLowerCase();

  if (entry.entity_type === "member") {
    // "invited jane@x.com" / "deleted member jane@x.com"
    if (entry.action === "invited") {
      return `invited ${entry.entity_label}`;
    }
    return `${verb} member ${entry.entity_label}`;
  }

  const details = (entry.details ?? null) as { to?: string } | null;
  const suffix =
    entry.action === "status_changed" && details?.to
      ? ` to ${details.to.replace(/_/g, " ")}`
      : "";

  return `${verb} ${entityLabel} “${entry.entity_label}”${suffix}`;
}
