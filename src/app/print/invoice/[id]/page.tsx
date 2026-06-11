import { notFound } from "next/navigation";

import type { Invoice, InvoiceItem } from "@/lib/database.types";
import { formatCurrency, formatDate } from "@/lib/format";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";

export const metadata = { title: "Invoice" };

type InvoiceWithClient = Invoice & {
  client: {
    name: string;
    company_name: string;
    email: string;
    phone: string;
  } | null;
};

interface PrintInvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintInvoicePage({
  params,
}: PrintInvoicePageProps) {
  const { id } = await params;
  const { org } = await getOrgContext();
  const supabase = await createClient();

  const [{ data: invoiceRow }, { data: itemRows }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, client:clients(name, company_name, email, phone)")
      .eq("id", id)
      .eq("organization_id", org.id)
      .maybeSingle(),
    supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .eq("organization_id", org.id)
      .order("sort_order"),
  ]);

  if (!invoiceRow) {
    notFound();
  }
  const invoice = invoiceRow as unknown as InvoiceWithClient;
  const items = (itemRows ?? []) as InvoiceItem[];

  return (
    <div className="mx-auto max-w-2xl space-y-10 bg-white p-10 text-neutral-900 print:p-0">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold tracking-tight">{org.name}</p>
          <p className="mt-1 text-sm text-neutral-500">Invoice</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 gap-8 text-sm">
        <div className="space-y-1">
          <p className="font-semibold text-neutral-500">Billed to</p>
          <p className="font-medium">{invoice.client?.name}</p>
          {invoice.client?.company_name ? (
            <p>{invoice.client.company_name}</p>
          ) : null}
          {invoice.client?.email ? <p>{invoice.client.email}</p> : null}
          {invoice.client?.phone ? <p>{invoice.client.phone}</p> : null}
        </div>
        <div className="space-y-1 text-right">
          <p>
            <span className="font-semibold text-neutral-500">Invoice № </span>
            {invoice.number}
          </p>
          <p>
            <span className="font-semibold text-neutral-500">Issued </span>
            {formatDate(invoice.issue_date)}
          </p>
          {invoice.due_date ? (
            <p>
              <span className="font-semibold text-neutral-500">Due </span>
              {formatDate(invoice.due_date)}
            </p>
          ) : null}
          <p className="capitalize">
            <span className="font-semibold text-neutral-500">Status </span>
            {invoice.status}
          </p>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-neutral-900 text-left">
            <th className="py-2 pr-4 font-semibold">Description</th>
            <th className="py-2 pr-4 text-right font-semibold">Qty</th>
            <th className="py-2 pr-4 text-right font-semibold">Unit price</th>
            <th className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: InvoiceItem) => (
            <tr key={item.id} className="border-b border-neutral-200">
              <td className="py-2 pr-4">{item.description}</td>
              <td className="py-2 pr-4 text-right">{item.quantity}</td>
              <td className="py-2 pr-4 text-right">
                {formatCurrency(item.unit_price, invoice.currency)}
              </td>
              <td className="py-2 text-right">
                {formatCurrency(item.line_total, invoice.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-64 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-500">Subtotal</span>
          <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
        </div>
        {invoice.tax_amount !== 0 ? (
          <div className="flex justify-between">
            <span className="text-neutral-500">Tax</span>
            <span>{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t-2 border-neutral-900 pt-2 text-base font-bold">
          <span>Total</span>
          <span>{formatCurrency(invoice.total, invoice.currency)}</span>
        </div>
      </div>

      {invoice.notes ? (
        <div className="text-sm">
          <p className="font-semibold text-neutral-500">Notes</p>
          <p className="mt-1 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      ) : null}

      <p className="border-t pt-4 text-center text-xs text-neutral-400">
        {org.name} — generated by CampaignDesk
      </p>
    </div>
  );
}
