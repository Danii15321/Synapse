import { afterEach, describe, expect, it, vi } from "vitest"

type MetadataRouteFactory = () => unknown | Promise<unknown>

function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isMetadataRouteFactory(value: unknown): value is MetadataRouteFactory {
  return typeof value === "function"
}

async function loadFactory(path: string): Promise<MetadataRouteFactory> {
  const module: unknown = await import(path)
  if (!isRecord(module) || !isMetadataRouteFactory(module.default)) {
    throw new Error(`${path} doit exporter une fonction par défaut`)
  }
  return module.default
}

describe("routes SEO générées par Next", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it(
    scenario(
      "robots.txt autorise le site public et protège les espaces privés",
      "SITE_URL=http://localhost:3000 et le shell public",
      "la fabrique robots de Next est appelée",
      "les moteurs reçoivent le sitemap absolu sans autorisation d'indexer compte, premium, auth ni API",
    ),
    async () => {
      vi.stubEnv("SITE_URL", "http://localhost:3000")
      const robots = await loadFactory("@/app/robots")

      const result = await robots()
      const serialized = JSON.stringify(result)

      expect(serialized).toContain("http://localhost:3000/sitemap.xml")
      expect(serialized).toMatch(/allow[^\]}]*\//i)
      for (const protectedPath of [
        "/compte",
        "/premium",
        "/api",
        "/login",
        "/register",
      ]) {
        expect(serialized).toContain(protectedPath)
      }
      expect(serialized).not.toMatch(/disallow[^\]}]*["']?\/["']?(?:,|\})/i)
    },
  )

  it(
    scenario(
      "sitemap.xml ne contient que les routes publiques du shell",
      "le site local et les rubriques/pages institutionnelles existantes",
      "la fabrique sitemap de Next est appelée",
      "toutes les URL sont absolues, les routes publiques sont présentes et aucune route protégée, auth ou API n'est référencée",
    ),
    async () => {
      vi.stubEnv("SITE_URL", "http://localhost:3000")
      const sitemap = await loadFactory("@/app/sitemap")

      const result = await sitemap()
      if (!Array.isArray(result))
        throw new Error("sitemap doit retourner un tableau")
      const urls = result
        .filter(isRecord)
        .map((entry) => entry.url)
        .filter((url): url is string => typeof url === "string")

      for (const path of [
        "/",
        "/prompts",
        "/formations",
        "/jeux",
        "/opportunites",
        "/a-propos",
        "/contact",
        "/mentions-legales",
        "/confidentialite",
        "/conditions-utilisation",
      ]) {
        expect(urls).toContain(
          `http://localhost:3000${path === "/" ? "" : path}`,
        )
      }
      expect(urls.every((url) => URL.canParse(url))).toBe(true)
      expect(urls.join("\n")).not.toMatch(
        /\/(?:compte|premium|login|register|forgot-password|api)(?:\/|$)/,
      )
    },
  )

  it(
    scenario(
      "Le manifest minimal décrit Synapse sans prétendre être une PWA installable",
      "la convention manifest App Router",
      "la fabrique manifest est appelée",
      "nom, nom court, langue, couleurs de marque et icônes sont présents sans service worker ni fonctionnalités hors périmètre",
    ),
    async () => {
      const manifest = await loadFactory("@/app/manifest")

      const result = await manifest()

      expect(result).toEqual(
        expect.objectContaining({
          background_color: "#FBF8F3",
          lang: "fr",
          name: expect.stringMatching(/Synapse/i),
          short_name: expect.stringMatching(/Synapse/i),
          theme_color: "#07183D",
          icons: expect.arrayContaining([
            expect.objectContaining({ src: expect.stringMatching(/icon/i) }),
          ]),
        }),
      )
      expect(JSON.stringify(result)).not.toMatch(
        /serviceworker|service_worker/i,
      )
    },
  )
})
