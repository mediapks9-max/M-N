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
