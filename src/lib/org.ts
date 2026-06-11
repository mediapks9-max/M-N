import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Organization, OrgRole, Profile } from "@/lib/database.types";

export const CURRENT_ORG_COOKIE = "campaigndesk_current_org";

export interface OrgMembership {
  role: OrgRole;
  organization: Organization;
}

export interface OrgContext {
  user: User;
  profile: Profile | null;
  memberships: OrgMembership[];
  /** The organization the user is currently working in. */
  org: Organization;
  /** The user's role in the current organization. */
  role: OrgRole;
}

/**
 * Resolves the authenticated user and their current organization.
 * Redirects to /login when unauthenticated and to /onboarding when
 * the user belongs to no organization yet.
 */
export async function getOrgContext(): Promise<OrgContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: membershipRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("memberships")
      .select("role, organization:organizations(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const memberships: OrgMembership[] = (membershipRows ?? []).flatMap(
    (row: { role: OrgRole; organization: Organization | null }) =>
      row.organization ? [{ role: row.role, organization: row.organization }] : []
  );

  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  const preferredOrgId = cookieStore.get(CURRENT_ORG_COOKIE)?.value;
  const current =
    memberships.find(
      (m: OrgMembership) => m.organization.id === preferredOrgId
    ) ?? memberships[0];

  return {
    user,
    profile: profile ?? null,
    memberships,
    org: current.organization,
    role: current.role,
  };
}
