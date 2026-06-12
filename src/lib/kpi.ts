import type { Campaign } from "@/lib/database.types";

/** Daily numbers, summable across days/campaigns. */
export interface StatTotals {
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  spend: number;
  revenue: number;
}

export const EMPTY_TOTALS: StatTotals = {
  impressions: 0,
  clicks: 0,
  leads: 0,
  conversions: 0,
  spend: 0,
  revenue: 0,
};

export function sumStats(rows: Partial<StatTotals>[]): StatTotals {
  const total = { ...EMPTY_TOTALS };
  for (const row of rows) {
    total.impressions += row.impressions ?? 0;
    total.clicks += row.clicks ?? 0;
    total.leads += row.leads ?? 0;
    total.conversions += row.conversions ?? 0;
    total.spend += row.spend ?? 0;
    total.revenue += row.revenue ?? 0;
  }
  return total;
}

export interface Kpis {
  ctr: number | null;
  cpc: number | null;
  cpl: number | null;
  cpa: number | null;
  roas: number | null;
  profit: number;
}

export function computeKpis(t: StatTotals): Kpis {
  return {
    ctr: t.impressions > 0 ? (t.clicks / t.impressions) * 100 : null,
    cpc: t.clicks > 0 ? t.spend / t.clicks : null,
    cpl: t.leads > 0 ? t.spend / t.leads : null,
    cpa: t.conversions > 0 ? t.spend / t.conversions : null,
    roas: t.spend > 0 ? t.revenue / t.spend : null,
    profit: t.revenue - t.spend,
  };
}

// ------------------------------------------------------------
// Recommendation engine: plain rules over recent daily data vs
// the campaign's targets. Honest, explainable, data-driven.
// ------------------------------------------------------------

export type RecommendationLevel = "action" | "warning" | "good";

export interface Recommendation {
  campaignId: string;
  campaignName: string;
  level: RecommendationLevel;
  message: string;
}

interface CampaignWithRecent {
  campaign: Pick<
    Campaign,
    | "id"
    | "name"
    | "status"
    | "daily_budget"
    | "target_cpl"
    | "target_cpa"
    | "target_roas"
    | "currency"
  >;
  /** Daily rows for the analysis window (e.g. last 7 days). */
  recent: StatTotals[];
}

export function buildRecommendations(
  items: CampaignWithRecent[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const { campaign, recent } of items) {
    if (campaign.status !== "active" || recent.length === 0) continue;

    const totals = sumStats(recent);
    const kpis = computeKpis(totals);
    const days = recent.length;
    const push = (level: RecommendationLevel, message: string) =>
      recommendations.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        level,
        message,
      });

    if (
      campaign.target_cpl !== null &&
      kpis.cpl !== null &&
      kpis.cpl > campaign.target_cpl * 1.25
    ) {
      push(
        "action",
        `CPL is ${kpis.cpl.toFixed(2)} over the last ${days} days — ${Math.round(
          (kpis.cpl / campaign.target_cpl - 1) * 100
        )}% above the ${campaign.target_cpl} target. Consider pausing weak ad sets or tightening targeting.`
      );
    }

    if (
      campaign.target_cpa !== null &&
      kpis.cpa !== null &&
      kpis.cpa > campaign.target_cpa * 1.25
    ) {
      push(
        "action",
        `CPA is ${kpis.cpa.toFixed(2)} vs a ${campaign.target_cpa} target over the last ${days} days. Review the conversion funnel before scaling.`
      );
    }

    if (kpis.roas !== null && totals.revenue > 0 && kpis.roas < 1) {
      push(
        "warning",
        `Spending more than it returns: ROAS ${kpis.roas.toFixed(2)} on ${totals.spend.toFixed(0)} spend in the last ${days} days.`
      );
    }

    if (campaign.daily_budget !== null && campaign.daily_budget > 0) {
      const avgDailySpend = totals.spend / days;
      if (avgDailySpend > campaign.daily_budget * 1.2) {
        push(
          "warning",
          `Pacing ${Math.round(
            (avgDailySpend / campaign.daily_budget - 1) * 100
          )}% over the ${campaign.daily_budget}/day budget (avg ${avgDailySpend.toFixed(0)}/day).`
        );
      }
    }

    const beatsRoasTarget =
      campaign.target_roas !== null &&
      kpis.roas !== null &&
      kpis.roas >= campaign.target_roas * 1.2;
    const beatsCplTarget =
      campaign.target_cpl !== null &&
      kpis.cpl !== null &&
      kpis.cpl <= campaign.target_cpl * 0.8;
    if (beatsRoasTarget || beatsCplTarget) {
      push(
        "good",
        beatsRoasTarget
          ? `Winner: ROAS ${kpis.roas!.toFixed(2)} is beating the ${campaign.target_roas} target — room to scale budget.`
          : `Winner: CPL ${kpis.cpl!.toFixed(2)} is well under the ${campaign.target_cpl} target — room to scale budget.`
      );
    }

    if (totals.clicks > 200 && totals.leads === 0) {
      push(
        "warning",
        `${Math.round(totals.clicks)} clicks with zero leads in the last ${days} days — check tracking or the landing page.`
      );
    }
  }

  const order: Record<RecommendationLevel, number> = {
    action: 0,
    warning: 1,
    good: 2,
  };
  return recommendations.sort(
    (a: Recommendation, b: Recommendation) => order[a.level] - order[b.level]
  );
}
