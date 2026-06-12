import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const str = (key: string): string =>
    typeof body[key] === "string" ? (body[key] as string) : "";

  const supabase = await createClient();
  await supabase.rpc("track_visit", {
    org_slug: process.env.NEXT_PUBLIC_SITE_ORG_SLUG ?? "",
    visitor: str("visitor"),
    page_path: str("path"),
    page_referrer: str("referrer"),
    utm_source: str("utm_source"),
    utm_medium: str("utm_medium"),
    utm_campaign: str("utm_campaign"),
    utm_term: str("utm_term"),
    utm_content: str("utm_content"),
  });

  return NextResponse.json({ ok: true });
}
