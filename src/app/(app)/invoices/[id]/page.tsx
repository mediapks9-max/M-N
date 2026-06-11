import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";

import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import type { Invoice, InvoiceItem } from "@/lib/database.types";
import { INVOICE_STATUS_CLASSES } from "@/lib/domain";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { InvoiceForm } from "../invoice-form";
import { InvoiceStatusActions } from "./invoice-status-actions";

export const metadata = { title: "Invoice" };

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params;
  const { org } = await getOrgContext();
  const supabase = await createClient();

  const [{ data: invoice }, { data: items }, { data: clients }, { data: engagements }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .eq("organization_id", org.id)
        .maybeSingle(),
      supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", id)
        .eq("organization_id", org.id)
        .order("sort_order"),
      supabase
        .from("clients")
        .select("id, name, default_currency")
        .eq("organization_id", org.id)
        .order("name"),
      supabase
        .from("engagements")
        .select("id, name, client_id")
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false }),
    ]);

  if (!invoice) {
    notFound();
  }
  const typedInvoice = invoice as Invoice;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {typedInvoice.number}
          </h1>
          <StatusPill
            label={typedInvoice.status}
            className={INVOICE_STATUS_CLASSES[typedInvoice.status]}
          />
        </div>
        {typedInvoice.direction === "outbound" ? (
          <Button variant="outline" asChild>
            <Link href={`/print/invoice/${typedInvoice.id}`} target="_blank">
              <Printer className="h-4 w-4" />
              PDF / print
            </Link>
          </Button>
        ) : null}
      </div>

      <InvoiceStatusActions
        orgId={org.id}
        invoiceId={typedInvoice.id}
        invoiceNumber={typedInvoice.number}
        status={typedInvoice.status}
      />

      <InvoiceForm
        orgId={org.id}
        clients={clients ?? []}
        engagements={engagements ?? []}
        invoice={typedInvoice}
        items={(items ?? []) as InvoiceItem[]}
      />
    </div>
  );
}
