"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import type { LeadStatus } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error?: string;
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

export async function setLeadStatusAction(
  orgId: string,
  leadId: string,
  status: LeadStatus
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId)
    .eq("organization_id", orgId)
    .select("id, name");

  if (error) {
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Lead not found." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "lead",
    entityId: leadId,
    entityLabel: data[0].name,
    action: "status_changed",
    details: { to: status },
  });

  revalidatePath("/leads");
  return {};
}

/** Creates a client from the lead and marks the lead converted. */
export async function convertLeadAction(
  orgId: string,
  leadId: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!lead) {
    return { error: "Lead not found." };
  }
  if (lead.client_id) {
    return { error: "This lead was already converted." };
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      organization_id: orgId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      type: "client",
      notes: [
        lead.message ? `From lead form: ${lead.message}` : "",
        lead.utm_source
          ? `Source: ${lead.utm_source}${lead.utm_campaign ? ` / ${lead.utm_campaign}` : ""}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    })
    .select("id, name")
    .single();

  if (clientError || !client) {
    return { error: clientError?.message ?? "Could not create the client." };
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update({ status: "converted", client_id: client.id })
    .eq("id", leadId)
    .eq("organization_id", orgId);

  if (updateError) {
    return { error: updateError.message };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "client",
    entityId: client.id,
    entityLabel: client.name,
    action: "created",
    details: { from_lead: leadId },
  });
  await logActivity({
    organizationId: orgId,
    entityType: "lead",
    entityId: leadId,
    entityLabel: lead.name,
    action: "status_changed",
    details: { to: "converted" },
  });

  revalidatePath("/leads");
  revalidatePath("/clients");
  return {};
}

export async function deleteLeadAction(
  orgId: string,
  leadId: string,
  leadName: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .eq("organization_id", orgId);

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "lead",
    entityId: leadId,
    entityLabel: leadName,
    action: "deleted",
  });

  revalidatePath("/leads");
  return {};
}
