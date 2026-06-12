"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { getCurrentUtm, getFirstTouch, getVisitorId } from "@/lib/tracking";

/**
 * Drop-in pageview/click tracker for the public site. Records every
 * page view (with UTM parameters from ad clicks) and captures
 * first-touch attribution for later lead submissions.
 */
export function SiteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const visitorId = getVisitorId();
    getFirstTouch(); // ensure first-touch is captured on entry
    const utm = getCurrentUtm();

    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitor: visitorId,
        path: window.location.pathname + window.location.search,
        referrer: document.referrer,
        ...utm,
      }),
      keepalive: true,
    }).catch(() => {
      // Tracking must never break the page.
    });
  }, [pathname]);

  return null;
}
