"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import type { InvoiceDirection, InvoiceStatus } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error?: string;
  invoiceId?: string;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return { supabase, user };
}

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceInput {
  direction: InvoiceDirection;
  client_id: string;
  engagement_id: string | null;
  issue_date: string;
  due_date: string | null;
  currency: string;
  status: InvoiceStatus;
  notes: string;
  tax_amount: number;
  items: InvoiceItemInput[];
}

function computeTotals(input: InvoiceInput): {
  subtotal: number;
  total: number;
} {
  const subtotal = input.items.reduce(
    (sum: number, item: InvoiceItemInput) =>
      sum + item.quantity * item.unit_price,
    0
  );
  return { subtotal, total: subtotal + input.tax_amount };
}

function validateInvoice(input: InvoiceInput): string | null {
  if (!input.client_id) {
    return "A client is required.";
  }
  if (!input.issue_date) {
    return "Issue date is required.";
  }
  const hasContent = input.items.some(
    (item: InvoiceItemInput) => item.description.trim() !== ""
  );
  if (!hasContent) {
    return "Add at least one line item.";
  }
  return null;
}

function cleanItems(input: InvoiceInput): InvoiceItemInput[] {
  return input.items.filter(
    (item: InvoiceItemInput) => item.description.trim() !== ""
  );
}

export async function createInvoiceAction(
  orgId: string,
  input: InvoiceInput
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const validationError = validateInvoice(input);
  if (validationError) {
    return { error: validationError };
  }

  const { data: number, error: numberError } = await supabase.rpc(
    "next_invoice_number",
    { org: orgId }
  );
  if (numberError || !number) {
    return {
      error: numberError?.message ?? "Could not allocate an invoice number.",
    };
  }

  const items = cleanItems(input);
  const { subtotal, total } = computeTotals({ ...input, items });

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      organization_id: orgId,
      number,
      direction: input.direction,
      client_id: input.client_id,
      engagement_id: input.engagement_id,
      issue_date: input.issue_date,
      due_date: input.due_date,
      currency: input.currency,
      status: input.status,
      notes: input.notes.trim(),
      subtotal,
      tax_amount: input.tax_amount,
      total,
      paid_at: input.status === "paid" ? new Date().toISOString() : null,
    })
    .select("id, number")
    .single();

  if (error || !invoice) {
    return { error: error?.message ?? "Could not create the invoice." };
  }

  const { error: itemsError } = await supabase.from("invoice_items").insert(
    items.map((item: InvoiceItemInput, index: number) => ({
      organization_id: orgId,
      invoice_id: invoice.id,
      description: item.description.trim(),
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price,
      sort_order: index,
    }))
  );

  if (itemsError) {
    await supabase.from("invoices").delete().eq("id", invoice.id);
    return { error: itemsError.message };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "invoice",
    entityId: invoice.id,
    entityLabel: invoice.number,
    action: "created",
    details: { direction: input.direction, total },
  });

  revalidatePath("/invoices");
  if (input.engagement_id) {
    revalidatePath(`/engagements/${input.engagement_id}`);
  }
  return { invoiceId: invoice.id };
}

export async function updateInvoiceAction(
  orgId: string,
  invoiceId: string,
  input: InvoiceInput
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const validationError = validateInvoice(input);
  if (validationError) {
    return { error: validationError };
  }

  const items = cleanItems(input);
  const { subtotal, total } = computeTotals({ ...input, items });

  const { data, error } = await supabase
    .from("invoices")
    .update({
      direction: input.direction,
      client_id: input.client_id,
      engagement_id: input.engagement_id,
      issue_date: input.issue_date,
      due_date: input.due_date,
      currency: input.currency,
      status: input.status,
      notes: input.notes.trim(),
      subtotal,
      tax_amount: input.tax_amount,
      total,
      paid_at: input.status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", invoiceId)
    .eq("organization_id", orgId)
    .select("id, number");

  if (error) {
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Invoice not found." };
  }

  // Replace line items wholesale: simplest correct sync.
  const { error: deleteError } = await supabase
    .from("invoice_items")
    .delete()
    .eq("invoice_id", invoiceId)
    .eq("organization_id", orgId);
  if (deleteError) {
    return { error: deleteError.message };
  }

  const { error: itemsError } = await supabase.from("invoice_items").insert(
    items.map((item: InvoiceItemInput, index: number) => ({
      organization_id: orgId,
      invoice_id: invoiceId,
      description: item.description.trim(),
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price,
      sort_order: index,
    }))
  );
  if (itemsError) {
    return { error: itemsError.message };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "invoice",
    entityId: invoiceId,
    entityLabel: data[0].number,
    action: "updated",
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  if (input.engagement_id) {
    revalidatePath(`/engagements/${input.engagement_id}`);
  }
  return { invoiceId };
}

export async function setInvoiceStatusAction(
  orgId: string,
  invoiceId: string,
  status: InvoiceStatus
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("invoices")
    .update({
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", invoiceId)
    .eq("organization_id", orgId)
    .select("id, number, engagement_id");

  if (error) {
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Invoice not found." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "invoice",
    entityId: invoiceId,
    entityLabel: data[0].number,
    action: status === "paid" ? "paid" : "status_changed",
    details: { to: status },
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  if (data[0].engagement_id) {
    revalidatePath(`/engagements/${data[0].engagement_id}`);
  }
  return {};
}

export async function deleteInvoiceAction(
  orgId: string,
  invoiceId: string,
  invoiceNumber: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("organization_id", orgId);

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "invoice",
    entityId: invoiceId,
    entityLabel: invoiceNumber,
    action: "deleted",
  });

  revalidatePath("/invoices");
  redirect("/invoices");
}
