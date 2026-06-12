// Central place for the site's canonical URL (used by sitemap, robots,
// metadata and structured data). Set NEXT_PUBLIC_SITE_URL in production.
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://m-n-sable.vercel.app"
  ).replace(/\/$/, "");
}
