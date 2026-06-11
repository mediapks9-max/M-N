"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import type { InviteRole } from "@/lib/database.types";
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

export async function updateOrganizationNameAction(
  orgId: string,
  name: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Organization name is required." };
  }

  // RLS only lets owners/admins update; .select() makes a silent
  // zero-row update surface as an error instead of a fake success.
  const { data, error } = await supabase
    .from("organizations")
    .update({ name: trimmed })
    .eq("id", orgId)
    .select("id");

  if (error) {
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "You don't have permission to rename this organization." };
  }

  revalidatePath("/", "layout");
  return {};
}

export async function createInviteAction(
  orgId: string,
  email: string,
  role: InviteRole
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return { error: "A valid email address is required." };
  }
  if (role !== "admin" && role !== "member") {
    return { error: "Invalid role." };
  }

  const { data: invite, error } = await supabase
    .from("invites")
    .insert({
      organization_id: orgId,
      email: trimmedEmail,
      role,
      invited_by: user.id,
    })
    .select("id")
    .single();

  if (error || !invite) {
    return { error: error?.message ?? "Could not create the invite." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "member",
    entityId: invite.id,
    entityLabel: trimmedEmail,
    action: "invited",
    details: { role },
  });

  revalidatePath("/settings");
  return {};
}

export async function revokeInviteAction(
  orgId: string,
  inviteId: string,
  inviteEmail: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("invites")
    .delete()
    .eq("id", inviteId)
    .eq("organization_id", orgId);

  if (error) {
    return { error: error.message };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "member",
    entityId: inviteId,
    entityLabel: inviteEmail,
    action: "deleted",
    details: { kind: "invite_revoked" },
  });

  revalidatePath("/settings");
  return {};
}

export async function removeMemberAction(
  orgId: string,
  membershipId: string,
  memberLabel: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("memberships")
    .delete()
    .eq("id", membershipId)
    .eq("organization_id", orgId)
    .select("id");

  if (error) {
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "You don't have permission to remove this member." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "member",
    entityId: membershipId,
    entityLabel: memberLabel,
    action: "deleted",
    details: { kind: "member_removed" },
  });

  revalidatePath("/settings");
  return {};
}
