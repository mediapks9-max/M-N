import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { InviteRole, OrgRole, Profile } from "@/lib/database.types";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { InviteForm } from "./invite-form";
import { InvitesTable, type InviteRowData } from "./invites-table";
import { MembersTable, type MemberRowData } from "./members-table";
import { OrgNameForm } from "./org-name-form";

export const metadata = { title: "Settings" };

interface MembershipWithProfile {
  id: string;
  role: OrgRole;
  user_id: string;
  profile: Pick<Profile, "id" | "full_name" | "email"> | null;
}

export default async function SettingsPage() {
  const { user, org, role } = await getOrgContext();
  const supabase = await createClient();
  const canManage = role === "owner" || role === "admin";

  const { data: membershipRows } = await supabase
    .from("memberships")
    .select("id, role, user_id, profile:profiles(id, full_name, email)")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: true });

  const members: MemberRowData[] = (
    (membershipRows ?? []) as unknown as MembershipWithProfile[]
  ).map((row: MembershipWithProfile) => ({
    membershipId: row.id,
    userId: row.user_id,
    fullName: row.profile?.full_name ?? "",
    email: row.profile?.email ?? "",
    role: row.role,
  }));

  let invites: InviteRowData[] = [];
  if (canManage) {
    const { data: inviteRows } = await supabase
      .from("invites")
      .select("id, email, role, token, expires_at")
      .eq("organization_id", org.id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    invites = (inviteRows ?? []).map(
      (row: {
        id: string;
        email: string;
        role: InviteRole;
        token: string;
        expires_at: string;
      }) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        token: row.token,
        expiresAt: row.expires_at,
      })
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            {canManage
              ? "Rename your organization."
              : "Only owners and admins can change organization settings."}
          </CardDescription>
        </CardHeader>
        {canManage ? (
          <CardContent>
            <OrgNameForm orgId={org.id} currentName={org.name} />
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            People with access to {org.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MembersTable
            orgId={org.id}
            members={members}
            currentUserId={user.id}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite a teammate</CardTitle>
            <CardDescription>
              Create an invite, then share the link. Invites expire after 14
              days.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <InviteForm orgId={org.id} />
            <InvitesTable orgId={org.id} invites={invites} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
