import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";

import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Invoice, InvoiceStatus } from "@/lib/database.types";
import { INVOICE_STATUSES, INVOICE_STATUS_CLASSES } from "@/lib/domain";
import { formatCurrency, formatDate } from "@/lib/format";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { InvoiceFilters } from "./invoice-filters";

export const metadata = { title: "Invoices" };

type InvoiceListRow = Invoice & {
  client: { name: string } | null;
  engagement: { id: string; name: string } | null;
};

interface InvoicesPageProps {
  searchParams: Promise<{ direction?: string; status?: string }>;
}

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const params = await searchParams;
  const { org } = await getOrgContext();
  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select("*, client:clients(name), engagement:engagements(id, name)")
    .eq("organization_id", org.id)
    .order("issue_date", { ascending: false });

  if (params.direction === "outbound" || params.direction === "inbound") {
    query = query.eq("direction", params.direction);
  }
  if (params.status && (INVOICE_STATUSES as string[]).includes(params.status)) {
    query = query.eq("status", params.status as InvoiceStatus);
  }

  const { data: rows } = await query;
  const invoices = (rows ?? []) as unknown as InvoiceListRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Outbound invoices you send to clients; inbound bills from
            suppliers.
          </p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="h-4 w-4" />
            New invoice
          </Link>
        </Button>
      </div>

      <InvoiceFilters />

      {invoices.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No invoices match.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead />
              <TableHead>Client</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice: InvoiceListRow) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {invoice.number}
                  </Link>
                </TableCell>
                <TableCell>
                  {invoice.direction === "outbound" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                      <ArrowUpRight className="h-3.5 w-3.5" /> out
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                      <ArrowDownLeft className="h-3.5 w-3.5" /> in
                    </span>
                  )}
                </TableCell>
                <TableCell>{invoice.client?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {invoice.engagement ? (
                    <Link
                      href={`/engagements/${invoice.engagement.id}?tab=invoices`}
                      className="underline-offset-4 hover:underline"
                    >
                      {invoice.engagement.name}
                    </Link>
                  ) : (
                    "—"
                  )}
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
  );
}
