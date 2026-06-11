"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import type { ClientType } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error?: string;
}

export interface ClientInput {
  name: string;
  company_name: string;
  email: string;
  phone: string;
  default_currency: string;
  type: ClientType;
  notes: string;
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

export async function createClientAction(
  orgId: string,
  input: ClientInput
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  if (!input.name.trim()) {
    return { error: "Client name is required." };
  }

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      company_name: input.company_name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      default_currency: input.default_currency,
      type: input.type,
      notes: input.notes.trim(),
    })
    .select("id, name")
    .single();

  if (error || !client) {
    return { error: error?.message ?? "Could not create the client." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "client",
    entityId: client.id,
    entityLabel: client.name,
    action: "created",
  });

  revalidatePath("/clients");
  return {};
}

export async function updateClientAction(
  orgId: string,
  clientId: string,
  input: ClientInput
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  if (!input.name.trim()) {
    return { error: "Client name is required." };
  }

  const { data, error } = await supabase
    .from("clients")
    .update({
      name: input.name.trim(),
      company_name: input.company_name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      default_currency: input.default_currency,
      type: input.type,
      notes: input.notes.trim(),
    })
    .eq("id", clientId)
    .eq("organization_id", orgId)
    .select("id, name");

  if (error) {
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Client not found." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "client",
    entityId: clientId,
    entityLabel: data[0].name,
    action: "updated",
  });

  revalidatePath("/clients");
  return {};
}

export async function deleteClientAction(
  orgId: string,
  clientId: string,
  clientName: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId)
    .eq("organization_id", orgId);

  if (error) {
    // Most common cause: invoices reference this client (on delete restrict).
    return { error: error.message };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "client",
    entityId: clientId,
    entityLabel: clientName,
    action: "deleted",
  });

  revalidatePath("/clients");
  return {};
}
