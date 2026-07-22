import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/explore"],
      disallow: [
        "/api/",
        "/auth/",
        "/history",
        "/login",
        "/notes",
        "/quotes",
        "/register",
        "/review",
        "/settings",
        "/video/",
        "/vocabulary",
      ],
    },
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
