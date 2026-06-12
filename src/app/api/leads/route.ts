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

  if (!str("name").trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!str("email").includes("@")) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_lead", {
    org_slug: process.env.NEXT_PUBLIC_SITE_ORG_SLUG ?? "",
    lead_name: str("name"),
    lead_email: str("email"),
    lead_phone: str("phone"),
    lead_message: str("message"),
    visitor: str("visitor"),
    landing: str("landing_page"),
    page_referrer: str("referrer"),
    utm_source: str("utm_source"),
    utm_medium: str("utm_medium"),
    utm_campaign: str("utm_campaign"),
    utm_term: str("utm_term"),
    utm_content: str("utm_content"),
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not submit. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: data });
}
