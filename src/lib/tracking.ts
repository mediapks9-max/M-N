// Client-side visitor identity + first-touch attribution, stored in
// cookies so the lead form can attribute signups to the original
// campaign click even if it happens pages (or days) later.

export interface FirstTouch {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  referrer: string;
  landing_page: string;
}

const VISITOR_COOKIE = "cd_visitor";
const FIRST_TOUCH_COOKIE = "cd_first_touch";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

function readCookie(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((row: string) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

export function getVisitorId(): string {
  let id = readCookie(VISITOR_COOKIE);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    writeCookie(VISITOR_COOKIE, id);
  }
  return id;
}

/** Captures UTM/referrer on the first page view; returns the stored value. */
export function getFirstTouch(): FirstTouch {
  const existing = readCookie(FIRST_TOUCH_COOKIE);
  if (existing) {
    try {
      return JSON.parse(existing) as FirstTouch;
    } catch {
      // fall through and re-capture
    }
  }

  const params = new URLSearchParams(window.location.search);
  const firstTouch: FirstTouch = {
    utm_source: params.get("utm_source") ?? "",
    utm_medium: params.get("utm_medium") ?? "",
    utm_campaign: params.get("utm_campaign") ?? "",
    utm_term: params.get("utm_term") ?? "",
    utm_content: params.get("utm_content") ?? "",
    referrer: document.referrer,
    landing_page: window.location.pathname + window.location.search,
  };
  writeCookie(FIRST_TOUCH_COOKIE, JSON.stringify(firstTouch));
  return firstTouch;
}

/** UTM params of the CURRENT page view (for per-visit click tracking). */
export function getCurrentUtm(): Omit<FirstTouch, "referrer" | "landing_page"> {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") ?? "",
    utm_medium: params.get("utm_medium") ?? "",
    utm_campaign: params.get("utm_campaign") ?? "",
    utm_term: params.get("utm_term") ?? "",
    utm_content: params.get("utm_content") ?? "",
  };
}
