import Link from "next/link";

import { ServiceBadge } from "@/components/service-badge";
import { StatusPill } from "@/components/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Engagement, EngagementStatus } from "@/lib/database.types";
import { ENGAGEMENT_STATUS_CLASSES, ENGAGEMENT_STATUSES } from "@/lib/domain";
import {
  computeEngagementFinancials,
  type InvoiceFinancialRow,
} from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/format";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { EngagementCreateDialog } from "./engagement-create-dialog";
import { EngagementFilters } from "./engagement-filters";

export const metadata = { title: "Engagements" };

type EngagementListRow = Engagement & {
  client: { id: string; name: string } | null;
  service: { id: string; name: string; color: string; slug: string } | null;
};

interface EngagementsPageProps {
  searchParams: Promise<{
    service?: string;
    client?: string;
    status?: string;
  }>;
}

export default async function EngagementsPage({
  searchParams,
}: EngagementsPageProps) {
  const params = await searchParams;
  const { org } = await getOrgContext();
  const supabase = await createClient();

  let query = supabase
    .from("engagements")
    .select(
      "*, client:clients(id, name), service:services(id, name, color, slug)"
    )
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });

  if (params.service) {
    query = query.eq("service_id", params.service);
  }
  if (params.client) {
    query = query.eq("client_id", params.client);
  }
  if (
    params.status &&
    (ENGAGEMENT_STATUSES as string[]).includes(params.status)
  ) {
    query = query.eq("status", params.status as EngagementStatus);
  }

  const [{ data: engagementRows }, { data: invoiceRows }, { data: clients }, { data: services }] =
    await Promise.all([
      query,
      supabase
        .from("invoices")
        .select("engagement_id, direction, status, total")
        .eq("organization_id", org.id),
      supabase
        .from("clients")
        .select("id, name")
        .eq("organization_id", org.id)
        .order("name"),
      supabase
        .from("services")
        .select("id, name, is_active")
        .eq("organization_id", org.id)
        .order("sort_order"),
    ]);

  const engagements = (engagementRows ?? []) as unknown as EngagementListRow[];
  const invoices = (invoiceRows ?? []) as InvoiceFinancialRow[];
  const activeServices = (services ?? []).filter(
    (s: { is_active: boolean }) => s.is_active
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Engagements</h1>
          <p className="text-sm text-muted-foreground">
            Every client × service unit of work, with live financials.
          </p>
        </div>
        <EngagementCreateDialog
          orgId={org.id}
          clients={clients ?? []}
          services={activeServices}
        />
      </div>

      <EngagementFilters
        services={(services ?? []).map(
          (s: { id: string; name: string }) => ({ id: s.id, name: s.name })
        )}
        clients={clients ?? []}
      />

      {(clients ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Add a client first — engagements link a client to a service.
        </p>
      ) : engagements.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No engagements match. Create one to get started.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {engagements.map((engagement: EngagementListRow) => {
              const financials = computeEngagementFinancials(
                engagement,
                invoices
              );
              return (
                <TableRow key={engagement.id}>
                  <TableCell>
                    <Link
                      href={`/engagements/${engagement.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {engagement.name}
                    </Link>
                  </TableCell>
                  <TableCell>{engagement.client?.name ?? "—"}</TableCell>
                  <TableCell>
                    {engagement.service ? (
                      <ServiceBadge
                        name={engagement.service.name}
                        color={engagement.service.color}
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      label={engagement.status}
                      className={ENGAGEMENT_STATUS_CLASSES[engagement.status]}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(engagement.start_date)}
                    {engagement.end_date
                      ? ` → ${formatDate(engagement.end_date)}`
                      : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(
                      engagement.budget_amount,
                      engagement.budget_currency
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(
                      financials.revenue,
                      engagement.budget_currency
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(
                      financials.cost,
                      engagement.budget_currency
                    )}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      financials.profit < 0 ? "text-red-600" : ""
                    }`}
                  >
                    {formatCurrency(
                      financials.profit,
                      engagement.budget_currency
                    )}
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
