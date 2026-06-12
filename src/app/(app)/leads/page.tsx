import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import type { Lead } from "@/lib/database.types";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { LeadsTable } from "./leads-table";

export const metadata = { title: "Leads" };

interface VisitRow {
  visitor_id: string;
  utm_source: string;
}

export default async function LeadsPage() {
  const { org } = await getOrgContext();
  const supabase = await createClient();

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: leadRows }, { data: visitRows, count: visitCount }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("*")
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("site_visits")
        .select("visitor_id, utm_source", { count: "exact" })
        .eq("organization_id", org.id)
        .gte("created_at", since)
        .limit(5000),
    ]);

  const leads = (leadRows ?? []) as Lead[];
  const visits = (visitRows ?? []) as VisitRow[];

  const uniqueVisitors = new Set(
    visits.map((visit: VisitRow) => visit.visitor_id).filter(Boolean)
  ).size;
  const leadsLast30 = leads.filter(
    (lead: Lead) => lead.created_at >= since
  ).length;
  const conversionRate =
    uniqueVisitors > 0
      ? `${((leadsLast30 / uniqueVisitors) * 100).toFixed(1)}%`
      : "—";

  const sourceCounts = new Map<string, number>();
  for (const visit of visits) {
    const key = visit.utm_source || "direct / organic";
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
  }
  const topSources = [...sourceCounts.entries()]
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Form submissions from your public site, with the campaign and page
          that brought each one in.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Page views (30d)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(visitCount ?? visits.length).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unique visitors (30d)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {uniqueVisitors.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Leads (30d)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{leadsLast30}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Visitor → lead rate</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{conversionRate}</p>
          </CardContent>
        </Card>
      </div>

      {topSources.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            Top sources (30d):
          </span>
          {topSources.map(([source, count]: [string, number]) => (
            <span
              key={source}
              className="rounded-md border bg-muted/40 px-2 py-0.5"
            >
              {source} · {count.toLocaleString()}
            </span>
          ))}
        </div>
      ) : null}

      <LeadsTable orgId={org.id} leads={leads} />
    </div>
  );
}
