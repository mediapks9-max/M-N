"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import type {
  DeliverableStatus,
  DeliverableType,
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

export interface DeliverableInput {
  type: DeliverableType;
  title: string;
  status: DeliverableStatus;
  due_date: string | null;
  url: string;
  notes: string;
}

function revalidateDeliverablePaths(engagementId: string): void {
  revalidatePath("/deliverables");
  revalidatePath(`/engagements/${engagementId}`);
}

export async function createDeliverableAction(
  orgId: string,
  engagementId: string,
  input: DeliverableInput
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  if (!input.title.trim()) {
    return { error: "Title is required." };
  }

  const { data: deliverable, error } = await supabase
    .from("deliverables")
    .insert({
      organization_id: orgId,
      engagement_id: engagementId,
      type: input.type,
      title: input.title.trim(),
      status: input.status,
      due_date: input.due_date,
      delivered_at:
        input.status === "delivered" || input.status === "published"
          ? new Date().toISOString()
          : null,
      url: input.url.trim() || null,
      notes: input.notes.trim(),
    })
    .select("id, title")
    .single();

  if (error || !deliverable) {
    return { error: error?.message ?? "Could not create the deliverable." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "deliverable",
    entityId: deliverable.id,
    entityLabel: deliverable.title,
    action: "created",
  });

  revalidateDeliverablePaths(engagementId);
  return {};
}

export async function updateDeliverableStatusAction(
  orgId: string,
  engagementId: string,
  deliverableId: string,
  status: DeliverableStatus
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const delivered = status === "delivered" || status === "published";
  const { data, error } = await supabase
    .from("deliverables")
    .update({
      status,
      delivered_at: delivered ? new Date().toISOString() : null,
    })
    .eq("id", deliverableId)
    .eq("organization_id", orgId)
    .select("id, title");

  if (error) {
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Deliverable not found." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "deliverable",
    entityId: deliverableId,
    entityLabel: data[0].title,
    action: delivered ? "delivered" : "status_changed",
    details: { to: status },
  });

  revalidateDeliverablePaths(engagementId);
  return {};
}

export async function deleteDeliverableAction(
  orgId: string,
  engagementId: string,
  deliverableId: string,
  title: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("deliverables")
    .delete()
    .eq("id", deliverableId)
    .eq("organization_id", orgId);

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "deliverable",
    entityId: deliverableId,
    entityLabel: title,
    action: "deleted",
  });

  revalidateDeliverablePaths(engagementId);
  return {};
}
