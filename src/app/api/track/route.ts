import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: CORS_HEADERS }
    );
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

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
