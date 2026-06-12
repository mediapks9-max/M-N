import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/leads",
          "/services",
          "/clients",
          "/engagements",
          "/deliverables",
          "/seo-articles",
          "/invoices",
          "/reports",
          "/activity",
          "/settings",
          "/onboarding",
          "/invite/",
          "/print/",
          "/login",
          "/signup",
        ],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
