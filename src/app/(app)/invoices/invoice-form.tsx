"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  Invoice,
  InvoiceDirection,
  InvoiceItem,
  InvoiceStatus,
} from "@/lib/database.types";
import { CURRENCIES, INVOICE_STATUSES } from "@/lib/domain";
import { formatCurrency } from "@/lib/format";
import {
  createInvoiceAction,
  updateInvoiceAction,
  type InvoiceInput,
  type InvoiceItemInput,
} from "./actions";

export interface ClientOption {
  id: string;
  name: string;
  default_currency: string;
}

export interface EngagementOption {
  id: string;
  name: string;
  client_id: string;
}

interface ItemRow {
  description: string;
  quantity: string;
  unit_price: string;
}

export interface InvoicePrefill {
  direction?: string;
  clientId?: string;
  amount?: string;
  description?: string;
}

interface InvoiceFormProps {
  orgId: string;
  clients: ClientOption[];
  engagements: EngagementOption[];
  /** Existing invoice when editing. */
  invoice?: Invoice;
  items?: InvoiceItem[];
  /** Preselected engagement (from ?engagement= query param). */
  preselectedEngagementId?: string;
  /** Optional prefill (e.g. supplier payout invoices). */
  prefill?: InvoicePrefill;
}

const NONE = "none";

function toItemRows(
  items: InvoiceItem[] | undefined,
  prefill: InvoicePrefill | undefined
): ItemRow[] {
  if (items && items.length > 0) {
    return items.map((item: InvoiceItem) => ({
      description: item.description,
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
    }));
  }
  if (prefill?.amount) {
    return [
      {
        description: prefill.description ?? "",
        quantity: "1",
        unit_price: prefill.amount,
      },
    ];
  }
  return [{ description: "", quantity: "1", unit_price: "" }];
}

export function InvoiceForm({
  orgId,
  clients,
  engagements,
  invoice,
  items,
  preselectedEngagementId,
  prefill,
}: InvoiceFormProps) {
  const router = useRouter();
  const preselectedEngagement = engagements.find(
    (e: EngagementOption) => e.id === preselectedEngagementId
  );

  const [direction, setDirection] = useState<InvoiceDirection>(
    invoice?.direction ??
      (prefill?.direction === "inbound" ? "inbound" : "outbound")
  );
  const [clientId, setClientId] = useState(
    invoice?.client_id ??
      prefill?.clientId ??
      preselectedEngagement?.client_id ??
      ""
  );
  const [engagementId, setEngagementId] = useState(
    invoice?.engagement_id ?? preselectedEngagement?.id ?? NONE
  );
  const [issueDate, setIssueDate] = useState(
    invoice?.issue_date ?? new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState(invoice?.due_date ?? "");
  const [currency, setCurrency] = useState(invoice?.currency ?? "USD");
  const [status, setStatus] = useState<InvoiceStatus>(
    invoice?.status ?? "draft"
  );
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [taxAmount, setTaxAmount] = useState(
    invoice ? String(invoice.tax_amount) : "0"
  );
  const [itemRows, setItemRows] = useState<ItemRow[]>(
    toItemRows(items, prefill)
  );
  const [isPending, startTransition] = useTransition();

  // Keep the linked engagement selectable even when the bill-to party is a
  // supplier (payout invoices) rather than the engagement's own client.
  const clientEngagements = engagements.filter(
    (e: EngagementOption) => e.client_id === clientId || e.id === engagementId
  );

  const subtotal = useMemo(
    () =>
      itemRows.reduce((sum: number, row: ItemRow) => {
        const qty = Number.parseFloat(row.quantity) || 0;
        const price = Number.parseFloat(row.unit_price) || 0;
        return sum + qty * price;
      }, 0),
    [itemRows]
  );
  const tax = Number.parseFloat(taxAmount) || 0;
  const total = subtotal + tax;

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItemRows(
      itemRows.map((row: ItemRow, i: number) =>
        i === index ? { ...row, ...patch } : row
      )
    );
  }

  function handleClientChange(value: string) {
    setClientId(value);
    setEngagementId(NONE);
    const client = clients.find((c: ClientOption) => c.id === value);
    if (client && !invoice) {
      setCurrency(client.default_currency);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: InvoiceInput = {
      direction,
      client_id: clientId,
      engagement_id: engagementId === NONE ? null : engagementId,
      issue_date: issueDate,
      due_date: dueDate || null,
      currency,
      status,
      notes,
      tax_amount: tax,
      items: itemRows.map(
        (row: ItemRow): InvoiceItemInput => ({
          description: row.description,
          quantity: Number.parseFloat(row.quantity) || 0,
          unit_price: Number.parseFloat(row.unit_price) || 0,
        })
      ),
    };
    startTransition(async () => {
      const result = invoice
        ? await updateInvoiceAction(orgId, invoice.id, input)
        : await createInvoiceAction(orgId, input);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(invoice ? "Invoice updated." : "Invoice created.");
        router.push(`/invoices/${result.invoiceId}`);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select
                value={direction}
                onValueChange={(value: string) =>
                  setDirection(value as InvoiceDirection)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">
                    Outbound (you bill a client)
                  </SelectItem>
                  <SelectItem value="inbound">
                    Inbound (a supplier bills you)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client / supplier</Label>
              <Select value={clientId} onValueChange={handleClientChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick one" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client: ClientOption) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Engagement (optional)</Label>
              <Select
                value={engagementId}
                onValueChange={(value: string) => setEngagementId(value)}
                disabled={!clientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {clientEngagements.map((engagement: EngagementOption) => (
                    <SelectItem key={engagement.id} value={engagement.id}>
                      {engagement.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="invIssue">Issue date</Label>
              <Input
                id="invIssue"
                type="date"
                required
                value={issueDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setIssueDate(e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invDue">Due date</Label>
              <Input
                id="invDue"
                type="date"
                value={dueDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDueDate(e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={currency}
                onValueChange={(value: string) => setCurrency(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c: string) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value: string) =>
                  setStatus(value as InvoiceStatus)
                }
              >
                <SelectTrigger className="capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_STATUSES.map((s: InvoiceStatus) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {itemRows.map((row: ItemRow, index: number) => (
            <div key={index} className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                {index === 0 ? <Label>Description</Label> : null}
                <Input
                  placeholder="What was delivered"
                  value={row.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateItem(index, { description: e.target.value })
                  }
                />
              </div>
              <div className="w-24 space-y-1">
                {index === 0 ? <Label>Qty</Label> : null}
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={row.quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateItem(index, { quantity: e.target.value })
                  }
                />
              </div>
              <div className="w-32 space-y-1">
                {index === 0 ? <Label>Unit price</Label> : null}
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.unit_price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateItem(index, { unit_price: e.target.value })
                  }
                />
              </div>
              <div className="w-28 pb-2 text-right text-sm font-medium">
                {formatCurrency(
                  (Number.parseFloat(row.quantity) || 0) *
                    (Number.parseFloat(row.unit_price) || 0),
                  currency
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                disabled={itemRows.length === 1}
                onClick={() =>
                  setItemRows(
                    itemRows.filter((_: ItemRow, i: number) => i !== index)
                  )
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setItemRows([
                ...itemRows,
                { description: "", quantity: "1", unit_price: "" },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            Add line
          </Button>

          <div className="ml-auto w-64 space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Tax</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="h-7 w-28 text-right"
                value={taxAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTaxAmount(e.target.value)
                }
              />
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(total, currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            placeholder="Payment terms, bank details, references…"
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setNotes(e.target.value)
            }
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !clientId}>
          {isPending
            ? "Saving…"
            : invoice
              ? "Save changes"
              : "Create invoice"}
        </Button>
      </div>
    </form>
  );
}
