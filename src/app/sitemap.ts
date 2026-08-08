import type { MetadataRoute } from "next"

import { config } from "@/server/config"

const PUBLIC_ROUTES = [
  "",
  "/prompts",
  "/formations",
  "/jeux",
  "/opportunites",
  "/a-propos",
  "/contact",
  "/mentions-legales",
  "/confidentialite",
  "/conditions-utilisation",
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((path) => ({ url: `${config.SITE_URL}${path}` }))
}
