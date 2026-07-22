import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date("2026-07-22"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/explore`,
      lastModified: new Date("2026-07-22"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date("2026-07-22"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date("2026-07-22"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
