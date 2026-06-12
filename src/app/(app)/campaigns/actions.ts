"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import type {
  CampaignChannel,
  CampaignStatus,
} from "@/lib/database.types";
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

export interface CampaignInput {
  engagement_id: string;
  name: string;
  channel: CampaignChannel;
  network: string;
  status: CampaignStatus;
  daily_budget: number | null;
  total_budget: number | null;
  target_cpl: number | null;
  target_cpa: number | null;
  target_roas: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  notes: string;
}

export async function createCampaignAction(
  orgId: string,
  input: CampaignInput
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  if (!input.name.trim()) {
    return { error: "Campaign name is required." };
  }
  if (!input.engagement_id) {
    return { error: "Pick the engagement this campaign belongs to." };
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      organization_id: orgId,
      engagement_id: input.engagement_id,
      name: input.name.trim(),
      channel: input.channel,
      network: input.network.trim(),
      status: input.status,
      daily_budget: input.daily_budget,
      total_budget: input.total_budget,
      target_cpl: input.target_cpl,
      target_cpa: input.target_cpa,
      target_roas: input.target_roas,
      currency: input.currency,
      start_date: input.start_date,
      end_date: input.end_date,
      notes: input.notes.trim(),
    })
    .select("id, name")
    .single();

  if (error || !campaign) {
    return { error: error?.message ?? "Could not create the campaign." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "campaign",
    entityId: campaign.id,
    entityLabel: campaign.name,
    action: "created",
  });

  revalidatePath("/campaigns");
  return {};
}

export async function updateCampaignAction(
  orgId: string,
  campaignId: string,
  input: CampaignInput
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  if (!input.name.trim()) {
    return { error: "Campaign name is required." };
  }

  const { data, error } = await supabase
    .from("campaigns")
    .update({
      engagement_id: input.engagement_id,
      name: input.name.trim(),
      channel: input.channel,
      network: input.network.trim(),
      status: input.status,
      daily_budget: input.daily_budget,
      total_budget: input.total_budget,
      target_cpl: input.target_cpl,
      target_cpa: input.target_cpa,
      target_roas: input.target_roas,
      currency: input.currency,
      start_date: input.start_date,
      end_date: input.end_date,
      notes: input.notes.trim(),
    })
    .eq("id", campaignId)
    .eq("organization_id", orgId)
    .select("id, name");

  if (error) {
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Campaign not found." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "campaign",
    entityId: campaignId,
    entityLabel: data[0].name,
    action: "updated",
  });

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  return {};
}

export async function setCampaignStatusAction(
  orgId: string,
  campaignId: string,
  status: CampaignStatus
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("campaigns")
    .update({ status })
    .eq("id", campaignId)
    .eq("organization_id", orgId)
    .select("id, name");

  if (error) {
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Campaign not found." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "campaign",
    entityId: campaignId,
    entityLabel: data[0].name,
    action: "status_changed",
    details: { to: status },
  });

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  return {};
}

export async function deleteCampaignAction(
  orgId: string,
  campaignId: string,
  name: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("organization_id", orgId);

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "campaign",
    entityId: campaignId,
    entityLabel: name,
    action: "deleted",
  });

  revalidatePath("/campaigns");
  redirect("/campaigns");
}

// ------------------------------------------------------------
// Daily stats: single-row upsert + CSV import
// ------------------------------------------------------------

export interface DailyStatInput {
  date: string;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  spend: number;
  revenue: number;
}

export async function upsertDailyStatAction(
  orgId: string,
  campaignId: string,
  input: DailyStatInput
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  if (!input.date) {
    return { error: "Date is required." };
  }

  const { error } = await supabase.from("campaign_stats").upsert(
    {
      organization_id: orgId,
      campaign_id: campaignId,
      ...input,
    },
    { onConflict: "campaign_id,date" }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
  return {};
}

export async function importStatsCsvAction(
  orgId: string,
  campaignId: string,
  campaignName: string,
  rows: DailyStatInput[]
): Promise<ActionResult & { imported?: number }> {
  const { supabase } = await requireUser();

  const valid = rows.filter(
    (row: DailyStatInput) => /^\d{4}-\d{2}-\d{2}$/.test(row.date)
  );
  if (valid.length === 0) {
    return { error: "No valid rows found (dates must be YYYY-MM-DD)." };
  }
  if (valid.length > 400) {
    return { error: "Too many rows in one import (max 400)." };
  }

  const { error } = await supabase.from("campaign_stats").upsert(
    valid.map((row: DailyStatInput) => ({
      organization_id: orgId,
      campaign_id: campaignId,
      ...row,
    })),
    { onConflict: "campaign_id,date" }
  );

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "campaign",
    entityId: campaignId,
    entityLabel: campaignName,
    action: "updated",
    details: { csv_rows_imported: valid.length },
  });

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
  return { imported: valid.length };
}

export async function deleteDailyStatAction(
  orgId: string,
  campaignId: string,
  statId: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("campaign_stats")
    .delete()
    .eq("id", statId)
    .eq("organization_id", orgId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return {};
}
