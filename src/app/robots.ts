import type { MetadataRoute } from "next"

import { config } from "@/server/config"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: "/",
      disallow: ["/api", "/compte", "/login", "/premium", "/register"],
      userAgent: "*",
    },
    sitemap: `${config.SITE_URL}/sitemap.xml`,
  }
}
