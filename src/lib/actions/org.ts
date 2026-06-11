"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CURRENT_ORG_COOKIE } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const ORG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

async function setCurrentOrgCookie(orgId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CURRENT_ORG_COOKIE, orgId, {
    path: "/",
    maxAge: ORG_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}

export interface ActionResult {
  error?: string;
}

export async function createOrganizationAction(
  orgName: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const trimmed = orgName.trim();
  if (!trimmed) {
    return { error: "Organization name is required." };
  }

  const { data: orgId, error } = await supabase.rpc("create_organization", {
    org_name: trimmed,
  });

  if (error || !orgId) {
    return { error: error?.message ?? "Could not create the organization." };
  }

  await setCurrentOrgCookie(orgId);
  redirect("/dashboard");
}

export async function switchOrganizationAction(orgId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Only allow switching to orgs the user actually belongs to.
  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership) {
    await setCurrentOrgCookie(orgId);
  }

  redirect("/dashboard");
}

export async function acceptInviteAction(token: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const { data: orgId, error } = await supabase.rpc("accept_invite", {
    invite_token: token,
  });

  if (error || !orgId) {
    return { error: error?.message ?? "Could not accept the invite." };
  }

  await setCurrentOrgCookie(orgId);
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(CURRENT_ORG_COOKIE);

  redirect("/login");
}
