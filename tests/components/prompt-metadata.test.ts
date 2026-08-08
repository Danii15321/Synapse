import { afterEach, describe, expect, it, vi } from "vitest"

type MetadataModule = Readonly<{
  generateMetadata: (
    props: Readonly<{
      params: Promise<{ slug: string }>
    }>,
  ) => Promise<unknown> | unknown
}>

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

function isMetadataModule(value: unknown): value is MetadataModule {
  return isRecord(value) && typeof value.generateMetadata === "function"
}

afterEach(() => {
  vi.doUnmock("@/server/auth/config")
  vi.doUnmock("@/server/services/prompt-service")
  vi.resetModules()
})

describe("métadonnées SEO et Open Graph des prompts", () => {
  it(
    scenario(
      "Même un membre PREMIUM ne place jamais le corps dans les métadonnées de partage",
      "un PromptFull PREMIUM avec summary, excerpt et une sentinelle body distincte",
      "generateMetadata construit SEO et Open Graph pour son slug",
      "le titre et la description publique sont présents, tandis que body et ses octets sont absents de tout champ et de toute URL sérialisée",
    ),
    async () => {
      const body = "CORPS-PREMIUM-METADATA-INTERDIT"
      const summary = "Résumé public pour le partage"
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue({
          expires: "2099-01-01T00:00:00.000Z",
          user: {
            email: "premium@example.test",
            id: "premium-user",
            membership: "PREMIUM",
          },
        }),
      }))
      vi.doMock("@/server/services/prompt-service", () => ({
        getPromptBySlug: vi.fn().mockResolvedValue({
          body,
          coverImage: "/images/prompts/partage.webp",
          domain: "entrepreneuriat",
          excerpt: "Extrait public distinct",
          id: "prompt-partage",
          slug: "prompt-partage",
          summary,
          tags: ["business-plan"],
          title: "Prompt partageable",
          visibility: "PREMIUM",
        }),
      }))
      const module: unknown = await vi.importActual(
        "@/app/(public)/prompts/[slug]/page",
      )
      if (!isMetadataModule(module)) {
        throw new Error(
          "la page détail doit exporter generateMetadata pour SEO et Open Graph",
        )
      }
      const metadata = await module.generateMetadata({
        params: Promise.resolve({ slug: "prompt-partage" }),
      })
      const serialized = JSON.stringify(metadata)

      expect(serialized).toContain("Prompt partageable")
      expect(serialized).toContain(summary)
      expect(serialized).not.toContain(body)
      expect(serialized).not.toMatch(/body/i)
      for (const value of Object.values(isRecord(metadata) ? metadata : {})) {
        if (typeof value === "string" && /^https?:/u.test(value)) {
          expect(value).not.toContain(encodeURIComponent(body))
        }
      }
    },
  )
})
