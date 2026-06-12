"use server";

import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error?: string;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function monthStartISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function monthEndISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
}

interface SimEngagement {
  id: string;
  name: string;
  pricing_model: string;
  service: { slug: string } | null;
}

/**
 * One "live demo" tick: nudges this month's metrics for active
 * engagements with realistic small increments, and occasionally
 * drops an event into the activity feed. Called on an interval by
 * the dashboard's Live Demo toggle.
 */
export async function simulationTickAction(
  orgId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: engagementRows } = await supabase
    .from("engagements")
    .select("id, name, pricing_model, service:services(slug)")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .limit(10);

  const engagements = (engagementRows ?? []) as unknown as SimEngagement[];
  if (engagements.length === 0) {
    return { error: "No active engagements to simulate." };
  }

  const periodStart = monthStartISO();

  for (const engagement of engagements) {
    const slug = engagement.service?.slug ?? "";
    const isPerformance = ["cpl", "cpa", "cpc", "rev_share"].includes(
      engagement.pricing_model
    );

    // Realistic per-tick increments by engagement flavor.
    let clicks = 0;
    let impressions = 0;
    let spend = 0;
    let leads = 0;
    let conversions = 0;
    let sessions = 0;
    let organic = 0;
    let revenueGenerated = 0;

    if (slug === "paid-campaigns" || isPerformance) {
      clicks = randInt(1, 4);
      impressions = randInt(1800, 7500);
      spend = Math.round(clicks * (4 + Math.random() * 5) * 100) / 100;
      leads = Math.random() < 0.35 ? 1 : 0;
      conversions = Math.random() < 0.15 ? 1 : 0;
      if (engagement.pricing_model === "rev_share") {
        revenueGenerated = randInt(40, 220);
      }
    } else if (slug === "traffic-seo") {
      sessions = randInt(12, 60);
      organic = randInt(8, 42);
      clicks = randInt(2, 14);
    } else {
      // Other services tick along quietly.
      sessions = randInt(0, 9);
      leads = Math.random() < 0.1 ? 1 : 0;
    }

    const { data: existing } = await supabase
      .from("engagement_metrics")
      .select(
        "id, clicks, impressions, spend, leads, conversions, sessions, organic_traffic, revenue_generated"
      )
      .eq("engagement_id", engagement.id)
      .eq("period_start", periodStart)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("engagement_metrics")
        .update({
          clicks: (existing.clicks ?? 0) + clicks,
          impressions: (existing.impressions ?? 0) + impressions,
          spend:
            Math.round(((existing.spend ?? 0) + spend) * 100) / 100,
          leads: (existing.leads ?? 0) + leads,
          conversions: (existing.conversions ?? 0) + conversions,
          sessions: (existing.sessions ?? 0) + sessions,
          organic_traffic: (existing.organic_traffic ?? 0) + organic,
          revenue_generated:
            (existing.revenue_generated ?? 0) + revenueGenerated,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("engagement_metrics").insert({
        organization_id: orgId,
        engagement_id: engagement.id,
        period_start: periodStart,
        period_end: monthEndISO(),
        clicks,
        impressions,
        spend,
        leads,
        conversions,
        sessions,
        organic_traffic: organic,
        revenue_generated: revenueGenerated,
        notes: "Live demo simulation",
      });
    }
  }

  // --- Campaign layer: today's daily stats tick along too ---
  const today = new Date().toISOString().slice(0, 10);
  const { data: activeCampaigns } = await supabase
    .from("campaigns")
    .select("id, target_cpl")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .limit(10);

  for (const campaign of activeCampaigns ?? []) {
    const impressions = randInt(900, 4200);
    const clicks = randInt(4, 22);
    const leads = Math.random() < 0.6 ? randInt(0, 3) : 0;
    const conversions = leads > 0 && Math.random() < 0.4 ? 1 : 0;
    const spend = Math.round(clicks * (2.5 + Math.random() * 4) * 100) / 100;
    const revenue =
      Math.round(leads * (60 + Math.random() * 80) * 100) / 100;

    const { data: existing } = await supabase
      .from("campaign_stats")
      .select("id, impressions, clicks, leads, conversions, spend, revenue")
      .eq("campaign_id", campaign.id)
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("campaign_stats")
        .update({
          impressions: existing.impressions + impressions,
          clicks: existing.clicks + clicks,
          leads: existing.leads + leads,
          conversions: existing.conversions + conversions,
          spend: Math.round((existing.spend + spend) * 100) / 100,
          revenue: Math.round((existing.revenue + revenue) * 100) / 100,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("campaign_stats").insert({
        organization_id: orgId,
        campaign_id: campaign.id,
        date: today,
        impressions,
        clicks,
        leads,
        conversions,
        spend,
        revenue,
      });
    }
  }

  // --- Publisher layer: placement revenue trickles in ---
  const { data: activePlacements } = await supabase
    .from("placements")
    .select("id")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .limit(6);

  const networks = ["AdSense", "Taboola", "Ezoic"];
  for (const placement of activePlacements ?? []) {
    const network = networks[randInt(0, networks.length - 1)];
    const impressions = randInt(500, 3000);
    const clicks = randInt(1, 12);
    const revenue = Math.round(clicks * (0.8 + Math.random() * 2.5) * 100) / 100;

    const { data: existing } = await supabase
      .from("placement_stats")
      .select("id, impressions, clicks, revenue")
      .eq("placement_id", placement.id)
      .eq("network", network)
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("placement_stats")
        .update({
          impressions: existing.impressions + impressions,
          clicks: existing.clicks + clicks,
          revenue: Math.round((existing.revenue + revenue) * 100) / 100,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("placement_stats").insert({
        organization_id: orgId,
        placement_id: placement.id,
        network,
        date: today,
        impressions,
        clicks,
        revenue,
      });
    }
  }

  // --- Lead funnel: visits trickle in, and sometimes a lead ---
  // Uses the same public RPCs as the real site, so the entire
  // production pipeline is exercised.
  const { data: orgRow } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", orgId)
    .maybeSingle();

  if (orgRow) {
    const utmPool = [
      { source: "", medium: "", campaign: "", referrer: "https://www.google.com/" },
      { source: "google", medium: "cpc", campaign: "brand-search", referrer: "https://www.google.com/" },
      { source: "facebook", medium: "cpc", campaign: "spring-launch", referrer: "https://l.facebook.com/" },
    ];
    const utm = utmPool[randInt(0, utmPool.length - 1)];
    const paths = [
      "/",
      "/blog",
      "/blog/small-business-seo-playbook",
      "/blog/google-ads-vs-seo",
    ];

    await supabase.rpc("track_visit", {
      org_slug: orgRow.slug,
      visitor: `sim-live-${randInt(1, 80)}`,
      page_path: paths[randInt(0, paths.length - 1)],
      page_referrer: utm.referrer,
      utm_source: utm.source,
      utm_medium: utm.medium,
      utm_campaign: utm.campaign,
    });

    if (Math.random() < 0.18) {
      const firstNames = ["Alex", "Dana", "Yuri", "Mia", "Leo", "Tamar", "Noa", "Ben"];
      const lastNames = ["Levi", "Marsh", "Kogan", "Reyes", "Brandt", "Okafor"];
      const name = `${firstNames[randInt(0, firstNames.length - 1)]} ${lastNames[randInt(0, lastNames.length - 1)]}`;
      await supabase.rpc("submit_lead", {
        org_slug: orgRow.slug,
        lead_name: name,
        lead_email: `${name.toLowerCase().replace(/\s+/g, ".")}.${randInt(10, 99)}@example.com`,
        lead_phone: "",
        lead_message: "[SIM] Live-demo lead — interested in your services.",
        visitor: `sim-live-${randInt(1, 80)}`,
        landing: "/blog",
        page_referrer: utm.referrer,
        utm_source: utm.source,
        utm_medium: utm.medium,
        utm_campaign: utm.campaign,
        lead_source: Math.random() < 0.3 ? "waveroi.biz" : "website",
      });
    }
  }

  // Occasionally surface the activity in the feed so it scrolls.
  if (Math.random() < 0.35) {
    const subject = engagements[randInt(0, engagements.length - 1)];
    await logActivity({
      organizationId: orgId,
      entityType: "metric",
      entityId: null,
      entityLabel: subject.name,
      action: "updated",
      details: { simulated: true },
    });
  }

  return {};
}
