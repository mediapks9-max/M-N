import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOrgContext } from "@/lib/org";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { org, role, profile } = await getOrgContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""} — you are
          working in <span className="font-medium">{org.name}</span>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Phase A foundation is live
            <Badge variant="secondary">{role}</Badge>
          </CardTitle>
          <CardDescription>
            Auth, organizations, memberships, invites and row-level security
            are set up. The activity command center arrives in Phase C.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Things you can do right now:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Invite teammates from Settings (owners and admins).</li>
            <li>Rename your organization in Settings.</li>
            <li>Create additional organizations and switch between them.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
