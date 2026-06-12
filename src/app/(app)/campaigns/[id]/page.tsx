import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, TrendingUp } from "lucide-react";

import { StatusPill } from "@/components/status-pill";
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
import { CampaignDialog } from "../campaign-dialog";
import { PerformanceChart, type ChartPoint } from "./performance-chart";
import { StatsManager } from "./stats-manager";

export const metadata = { title: "Campaign" };

type CampaignDetail = Campaign & {
  engagement: {
    id: string;
    name: string;
    client: { name: string } | null;
  } | null;
};

interface CampaignPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { id } = await params;
  const { org } = await getOrgContext();
  const supabase = await createClient();

  const [{ data: campaignRow }, { data: statRows }, { data: engagementRows }] =
    await Promise.all([
      supabase
        .from("campaigns")
        .select(
          "*, engagement:engagements(id, name, client:clients!engagements_client_id_organization_id_fkey(name))"
        )
        .eq("id", id)
        .eq("organization_id", org.id)
        .maybeSingle(),
      supabase
        .from("campaign_stats")
        .select("*")
        .eq("campaign_id", id)
        .eq("organization_id", org.id)
        .order("date", { ascending: false })
        .limit(120),
      supabase
        .from("engagements")
        .select(
          "id, name, client:clients!engagements_client_id_organization_id_fkey(name)"
        )
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false }),
    ]);

  if (!campaignRow) {
    notFound();
  }
  const campaign = campaignRow as unknown as CampaignDetail;
  const stats = (statRows ?? []) as CampaignStat[];

  const totals = sumStats(stats);
  const kpis = computeKpis(totals);

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const recommendations = buildRecommendations([
    {
      campaign,
      recent: stats.filter((stat: CampaignStat) => stat.date >= sevenDaysAgo),
    },
  ]);

  const chartData: ChartPoint[] = [...stats]
    .sort((a: CampaignStat, b: CampaignStat) => a.date.localeCompare(b.date))
    .map((stat: CampaignStat) => ({
      date: stat.date.slice(5),
      spend: Math.round(stat.spend * 100) / 100,
      revenue: Math.round(stat.revenue * 100) / 100,
      leads: stat.leads,
    }));

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

  const kpiItems: { label: string; value: string; alert?: boolean }[] = [
    { label: "Spend", value: formatCurrency(totals.spend, campaign.currency) },
    {
      label: "Revenue",
      value: formatCurrency(totals.revenue, campaign.currency),
    },
    { label: "Leads", value: formatNumber(totals.leads) },
    {
      label: `CPL${campaign.target_cpl !== null ? ` (target ${campaign.target_cpl})` : ""}`,
      value:
        kpis.cpl !== null ? formatCurrency(kpis.cpl, campaign.currency) : "—",
      alert:
        campaign.target_cpl !== null &&
        kpis.cpl !== null &&
        kpis.cpl > campaign.target_cpl,
    },
    {
      label: "CTR",
      value: kpis.ctr !== null ? `${kpis.ctr.toFixed(2)}%` : "—",
    },
    {
      label: `ROAS${campaign.target_roas !== null ? ` (target ${campaign.target_roas})` : ""}`,
      value: kpis.roas !== null ? `${kpis.roas.toFixed(2)}×` : "—",
      alert:
        campaign.target_roas !== null &&
        kpis.roas !== null &&
        kpis.roas < campaign.target_roas,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/campaigns"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← All campaigns
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span
              className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"
              style={{
                color: CAMPAIGN_CHANNEL_COLORS[campaign.channel],
                borderColor: `${CAMPAIGN_CHANNEL_COLORS[campaign.channel]}55`,
              }}
            >
              {CAMPAIGN_CHANNEL_LABELS[campaign.channel]}
            </span>
            <StatusPill
              label={campaign.status}
              className={CAMPAIGN_STATUS_CLASSES[campaign.status]}
            />
            {campaign.engagement ? (
              <Link
                href={`/engagements/${campaign.engagement.id}`}
                className="underline-offset-4 hover:underline"
              >
                {campaign.engagement.name}
                {campaign.engagement.client
                  ? ` · ${campaign.engagement.client.name}`
                  : ""}
              </Link>
            ) : null}
          </div>
        </div>
        <CampaignDialog
          orgId={org.id}
          engagements={engagementOptions}
          campaign={campaign}
        />
      </div>

      {/* KPI strip (all-time over loaded window) */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpiItems.map(
          (item: { label: string; value: string; alert?: boolean }) => (
            <div
              key={item.label}
              className="rounded-xl border bg-card p-4 shadow-sm"
            >
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p
                className={cn(
                  "text-xl font-bold",
                  item.alert && "text-red-600"
                )}
              >
                {item.value}
              </p>
            </div>
          )
        )}
      </div>

      {recommendations.length > 0 ? (
        <ul className="space-y-2 rounded-xl border p-4">
          {recommendations.map((rec: Recommendation, index: number) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              {rec.level === "good" ? (
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    rec.level === "action" ? "text-red-500" : "text-amber-500"
                  )}
                />
              )}
              <span>{rec.message}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <PerformanceChart data={chartData} />

      <StatsManager
        orgId={org.id}
        campaignId={campaign.id}
        campaignName={campaign.name}
        currency={campaign.currency}
        stats={stats}
      />
    </div>
  );
}
