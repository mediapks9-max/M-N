"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import type { EngagementStatus, FinancialMode } from "@/lib/database.types";
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

export interface EngagementCreateInput {
  client_id: string;
  service_id: string;
  name: string;
  status: EngagementStatus;
  start_date: string | null;
  end_date: string | null;
  budget_amount: number | null;
  budget_currency: string;
  notes: string;
}

export async function createEngagementAction(
  orgId: string,
  input: EngagementCreateInput
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  if (!input.name.trim()) {
    return { error: "Engagement name is required." };
  }
  if (!input.client_id || !input.service_id) {
    return { error: "Client and service are required." };
  }

  const { data: engagement, error } = await supabase
    .from("engagements")
    .insert({
      organization_id: orgId,
      client_id: input.client_id,
      service_id: input.service_id,
      name: input.name.trim(),
      status: input.status,
      start_date: input.start_date,
      end_date: input.end_date,
      budget_amount: input.budget_amount,
      budget_currency: input.budget_currency,
      notes: input.notes.trim(),
    })
    .select("id, name")
    .single();

  if (error || !engagement) {
    return { error: error?.message ?? "Could not create the engagement." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "engagement",
    entityId: engagement.id,
    entityLabel: engagement.name,
    action: "created",
  });

  revalidatePath("/engagements");
  return {};
}

export interface EngagementUpdateInput extends EngagementCreateInput {
  financial_mode: FinancialMode;
  manual_revenue: number | null;
  manual_cost: number | null;
}

export async function updateEngagementAction(
  orgId: string,
  engagementId: string,
  input: EngagementUpdateInput
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  if (!input.name.trim()) {
    return { error: "Engagement name is required." };
  }

  const { data: before } = await supabase
    .from("engagements")
    .select("status")
    .eq("id", engagementId)
    .eq("organization_id", orgId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("engagements")
    .update({
      client_id: input.client_id,
      service_id: input.service_id,
      name: input.name.trim(),
      status: input.status,
      start_date: input.start_date,
      end_date: input.end_date,
      budget_amount: input.budget_amount,
      budget_currency: input.budget_currency,
      financial_mode: input.financial_mode,
      manual_revenue: input.manual_revenue,
      manual_cost: input.manual_cost,
      notes: input.notes.trim(),
    })
    .eq("id", engagementId)
    .eq("organization_id", orgId)
    .select("id, name, status");

  if (error) {
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Engagement not found." };
  }

  const statusChanged = before && before.status !== data[0].status;
  await logActivity({
    organizationId: orgId,
    entityType: "engagement",
    entityId: engagementId,
    entityLabel: data[0].name,
    action: statusChanged ? "status_changed" : "updated",
    details: statusChanged
      ? { from: before.status, to: data[0].status }
      : null,
  });

  revalidatePath("/engagements");
  revalidatePath(`/engagements/${engagementId}`);
  return {};
}

export async function deleteEngagementAction(
  orgId: string,
  engagementId: string,
  engagementName: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("engagements")
    .delete()
    .eq("id", engagementId)
    .eq("organization_id", orgId);

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "engagement",
    entityId: engagementId,
    entityLabel: engagementName,
    action: "deleted",
  });

  revalidatePath("/engagements");
  redirect("/engagements");
}

// ------------------------------------------------------------
// Metrics
// ------------------------------------------------------------

export interface MetricInput {
  period_start: string;
  period_end: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  leads: number | null;
  conversions: number | null;
  sessions: number | null;
  organic_traffic: number | null;
  revenue_generated: number | null;
  notes: string;
}

export async function addMetricAction(
  orgId: string,
  engagementId: string,
  engagementName: string,
  input: MetricInput
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  if (!input.period_start || !input.period_end) {
    return { error: "Period start and end are required." };
  }
  if (input.period_end < input.period_start) {
    return { error: "Period end must be after period start." };
  }

  const { data: metric, error } = await supabase
    .from("engagement_metrics")
    .insert({
      organization_id: orgId,
      engagement_id: engagementId,
      period_start: input.period_start,
      period_end: input.period_end,
      spend: input.spend,
      impressions: input.impressions,
      clicks: input.clicks,
      leads: input.leads,
      conversions: input.conversions,
      sessions: input.sessions,
      organic_traffic: input.organic_traffic,
      revenue_generated: input.revenue_generated,
      notes: input.notes.trim(),
    })
    .select("id")
    .single();

  if (error || !metric) {
    if (error?.code === "23505") {
      return { error: "A metrics entry for this period start already exists." };
    }
    return { error: error?.message ?? "Could not add the metrics entry." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "metric",
    entityId: metric.id,
    entityLabel: `${engagementName} (${input.period_start})`,
    action: "created",
  });

  revalidatePath(`/engagements/${engagementId}`);
  return {};
}

export async function deleteMetricAction(
  orgId: string,
  engagementId: string,
  metricId: string,
  label: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("engagement_metrics")
    .delete()
    .eq("id", metricId)
    .eq("organization_id", orgId);

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "metric",
    entityId: metricId,
    entityLabel: label,
    action: "deleted",
  });

  revalidatePath(`/engagements/${engagementId}`);
  return {};
}
