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
            Phase B modules are live
            <Badge variant="secondary">{role}</Badge>
          </CardTitle>
          <CardDescription>
            The activity command center lands here in Phase C. Until then,
            everything runs from the sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Suggested first steps:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Review your service catalog under Services (8 defaults seeded).</li>
            <li>Add your clients, then create engagements (client × service).</li>
            <li>Track deliverables, log KPI metrics, draft SEO articles.</li>
            <li>Create invoices — numbering, totals and PDF export included.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
