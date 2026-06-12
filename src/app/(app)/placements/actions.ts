"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
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

export async function createPlacementAction(
  orgId: string,
  supplierId: string,
  name: string,
  adFormat: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  if (!name.trim()) {
    return { error: "Placement name is required." };
  }
  if (!supplierId) {
    return { error: "Pick the publisher this placement belongs to." };
  }

  const { data: placement, error } = await supabase
    .from("placements")
    .insert({
      organization_id: orgId,
      supplier_id: supplierId,
      name: name.trim(),
      ad_format: adFormat.trim(),
    })
    .select("id, name")
    .single();

  if (error || !placement) {
    return { error: error?.message ?? "Could not create the placement." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "placement",
    entityId: placement.id,
    entityLabel: placement.name,
    action: "created",
  });

  revalidatePath("/placements");
  return {};
}

export async function deletePlacementAction(
  orgId: string,
  placementId: string,
  name: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("placements")
    .delete()
    .eq("id", placementId)
    .eq("organization_id", orgId);

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "placement",
    entityId: placementId,
    entityLabel: name,
    action: "deleted",
  });

  revalidatePath("/placements");
  return {};
}

export interface PlacementStatInput {
  network: string;
  date: string;
  impressions: number;
  clicks: number;
  revenue: number;
}

export async function upsertPlacementStatAction(
  orgId: string,
  placementId: string,
  input: PlacementStatInput
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  if (!input.network.trim()) {
    return { error: "Network is required." };
  }
  if (!input.date) {
    return { error: "Date is required." };
  }

  const { error } = await supabase.from("placement_stats").upsert(
    {
      organization_id: orgId,
      placement_id: placementId,
      network: input.network.trim(),
      date: input.date,
      impressions: input.impressions,
      clicks: input.clicks,
      revenue: input.revenue,
    },
    { onConflict: "placement_id,network,date" }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/placements");
  return {};
}
