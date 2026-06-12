import Link from "next/link";
import {
  AlertTriangle,
  CircleCheck,
  TrendingUp,
} from "lucide-react";

import { StatusPill } from "@/components/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Campaign, CampaignStat } from "@/lib/database.types";
import {
  CAMPAIGN_CHANNEL_COLORS,
  CAMPAIGN_CHANNEL_LABELS,
  CAMPAIGN_STATUS_CLASSES,
} from "@/lib/domain";
import {
  buildRecommendations,
  computeKpis,
  sumStats,
  type Recommendation,
} from "@/lib/kpi";
import { formatCurrency, formatNumber } from "@/lib/format";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { CampaignDialog } from "./campaign-dialog";

export const metadata = { title: "Campaigns" };

const WINDOW_DAYS = 7;

type CampaignRow = Campaign & {
  engagement: {
    id: string;
    name: string;
    client: { name: string } | null;
  } | null;
};

export default async function CampaignsPage() {
  const { org } = await getOrgContext();
  const supabase = await createClient();

  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [{ data: campaignRows }, { data: statRows }, { data: engagementRows }] =
    await Promise.all([
      supabase
        .from("campaigns")
        .select(
          "*, engagement:engagements(id, name, client:clients!engagements_client_id_organization_id_fkey(name))"
        )
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("campaign_stats")
        .select("*")
        .eq("organization_id", org.id)
        .gte("date", since),
      supabase
        .from("engagements")
        .select(
          "id, name, client:clients!engagements_client_id_organization_id_fkey(name)"
        )
        .eq("organization_id", org.id)
        .in("status", ["active", "proposal", "paused"])
        .order("created_at", { ascending: false }),
    ]);

  const campaigns = (campaignRows ?? []) as unknown as CampaignRow[];
  const stats = (statRows ?? []) as CampaignStat[];

  const statsByCampaign = new Map<string, CampaignStat[]>();
  for (const stat of stats) {
    const list = statsByCampaign.get(stat.campaign_id) ?? [];
    list.push(stat);
    statsByCampaign.set(stat.campaign_id, list);
  }

  const orgTotals = sumStats(stats);
  const orgKpis = computeKpis(orgTotals);

  const recommendations = buildRecommendations(
    campaigns.map((campaign: CampaignRow) => ({
      campaign,
      recent: statsByCampaign.get(campaign.id) ?? [],
    }))
  );

  const engagementOptions = (
    (engagementRows ?? []) as unknown as {
      id: string;
      name: string;
      client: { name: string } | null;
    }[]
  ).map((engagement) => ({
    id: engagement.id,
    name: engagement.name,
    clientName: engagement.client?.name ?? "—",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Central campaign management — KPIs computed from daily performance
            data (last {WINDOW_DAYS} days).
          </p>
        </div>
        <CampaignDialog orgId={org.id} engagements={engagementOptions} />
      </div>

      {/* Org-level KPI strip */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Spend (7d)", value: formatCurrency(orgTotals.spend, "USD") },
          { label: "Revenue (7d)", value: formatCurrency(orgTotals.revenue, "USD") },
          { label: "Leads (7d)", value: formatNumber(orgTotals.leads) },
          {
            label: "Avg CPL",
            value: orgKpis.cpl !== null ? formatCurrency(orgKpis.cpl, "USD") : "—",
          },
          {
            label: "Avg CPC",
            value: orgKpis.cpc !== null ? formatCurrency(orgKpis.cpc, "USD") : "—",
          },
          {
            label: "ROAS",
            value: orgKpis.roas !== null ? `${orgKpis.roas.toFixed(2)}×` : "—",
          },
        ].map((item: { label: string; value: string }) => (
          <div key={item.label} className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-xl font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 ? (
        <div className="space-y-2 rounded-xl border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Optimization signals
          </h2>
          <ul className="space-y-2">
            {recommendations.slice(0, 6).map(
              (rec: Recommendation, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  {rec.level === "action" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  ) : rec.level === "warning" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  )}
                  <span>
                    <Link
                      href={`/campaigns/${rec.campaignId}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {rec.campaignName}
                    </Link>
                    : {rec.message}
                  </span>
                </li>
              )
            )}
          </ul>
        </div>
      ) : campaigns.length > 0 ? (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm text-muted-foreground">
          <CircleCheck className="h-4 w-4 text-emerald-500" />
          No optimization signals — all active campaigns are within targets.
        </div>
      ) : null}

      {campaigns.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No campaigns yet. Create one, then log daily performance (manually
          or via CSV import) to light up the KPIs.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Spend (7d)</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">CPL</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead className="text-right">Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign: CampaignRow) => {
              const totals = sumStats(statsByCampaign.get(campaign.id) ?? []);
              const kpis = computeKpis(totals);
              const cplOver =
                campaign.target_cpl !== null &&
                kpis.cpl !== null &&
                kpis.cpl > campaign.target_cpl;
              return (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {campaign.name}
                    </Link>
                    {campaign.network ? (
                      <p className="text-xs text-muted-foreground">
                        {campaign.network}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {campaign.engagement?.client?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
                      style={{
                        color: CAMPAIGN_CHANNEL_COLORS[campaign.channel],
                        borderColor: `${CAMPAIGN_CHANNEL_COLORS[campaign.channel]}55`,
                      }}
                    >
                      {CAMPAIGN_CHANNEL_LABELS[campaign.channel]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      label={campaign.status}
                      className={CAMPAIGN_STATUS_CLASSES[campaign.status]}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.spend, campaign.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(totals.leads)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right",
                      cplOver && "font-medium text-red-600"
                    )}
                  >
                    {kpis.cpl !== null
                      ? formatCurrency(kpis.cpl, campaign.currency)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {kpis.roas !== null ? `${kpis.roas.toFixed(2)}×` : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      kpis.profit < 0 && "text-red-600"
                    )}
                  >
                    {formatCurrency(kpis.profit, campaign.currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
