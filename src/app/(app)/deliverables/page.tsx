import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { StatusPill } from "@/components/status-pill";
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
  DeliverableStatus,
  DeliverableType,
} from "@/lib/database.types";
import {
  DELIVERABLE_STATUSES,
  DELIVERABLE_STATUS_CLASSES,
  DELIVERABLE_STATUS_LABELS,
  DELIVERABLE_TYPES,
  DELIVERABLE_TYPE_LABELS,
} from "@/lib/domain";
import { formatDate, isOverdue } from "@/lib/format";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { DeliverablesFilters } from "./deliverables-filters";

export const metadata = { title: "Deliverables" };

type DeliverableListRow = Deliverable & {
  engagement: {
    id: string;
    name: string;
    client: { name: string } | null;
  } | null;
};

interface DeliverablesPageProps {
  searchParams: Promise<{ status?: string; type?: string }>;
}

export default async function DeliverablesPage({
  searchParams,
}: DeliverablesPageProps) {
  const params = await searchParams;
  const { org } = await getOrgContext();
  const supabase = await createClient();

  let query = supabase
    .from("deliverables")
    .select(
      "*, engagement:engagements(id, name, client:clients!engagements_client_id_organization_id_fkey(name))"
    )
    .eq("organization_id", org.id)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (
    params.status &&
    (DELIVERABLE_STATUSES as string[]).includes(params.status)
  ) {
    query = query.eq("status", params.status as DeliverableStatus);
  }
  if (params.type && (DELIVERABLE_TYPES as string[]).includes(params.type)) {
    query = query.eq("type", params.type as DeliverableType);
  }

  const { data: rows } = await query;
  const deliverables = (rows ?? []) as unknown as DeliverableListRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Deliverables</h1>
        <p className="text-sm text-muted-foreground">
          Every work output across engagements, sorted by due date. Add new
          deliverables from an engagement&apos;s Deliverables tab.
        </p>
      </div>

      <DeliverablesFilters />

      {deliverables.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No deliverables match.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliverables.map((deliverable: DeliverableListRow) => {
              const overdue =
                isOverdue(deliverable.due_date) &&
                deliverable.status !== "delivered" &&
                deliverable.status !== "published";
              return (
                <TableRow key={deliverable.id}>
                  <TableCell className="font-medium">
                    {deliverable.title}
                    {deliverable.url ? (
                      <a
                        href={deliverable.url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 inline-block align-middle text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {deliverable.engagement ? (
                      <Link
                        href={`/engagements/${deliverable.engagement.id}?tab=deliverables`}
                        className="underline-offset-4 hover:underline"
                      >
                        {deliverable.engagement.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {deliverable.engagement?.client?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {DELIVERABLE_TYPE_LABELS[deliverable.type]}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      label={DELIVERABLE_STATUS_LABELS[deliverable.status]}
                      className={DELIVERABLE_STATUS_CLASSES[deliverable.status]}
                    />
                  </TableCell>
                  <TableCell
                    className={overdue ? "font-medium text-red-600" : ""}
                  >
                    {formatDate(deliverable.due_date)}
                    {overdue ? " (overdue)" : ""}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
