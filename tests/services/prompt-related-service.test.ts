import { afterEach, describe, expect, it, vi } from "vitest"

import type { PromptCardDto, PromptDomain } from "@/lib/validators/prompt"

type RelatedService = Readonly<{
  getRelatedPrompts: (
    input: Readonly<{
      domain: PromptDomain
      excludeId: string
    }>,
  ) => Promise<PromptCardDto[]>
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

function isRelatedService(value: unknown): value is RelatedService {
  return isRecord(value) && typeof value.getRelatedPrompts === "function"
}

async function loadRelatedService(): Promise<RelatedService> {
  const module: unknown = await import("@/server/services/prompt-service")
  if (!isRelatedService(module)) {
    throw new Error(
      "prompt-service doit exporter getRelatedPrompts avec le contrat arbitré",
    )
  }
  return module
}

const PUBLIC_CARD = {
  coverImage: null,
  domain: "ia",
  id: "related-1",
  slug: "related-1",
  summary: "Résumé public",
  tags: ["ia"],
  title: "Suggestion publique",
  visibility: "PREMIUM",
} as const

afterEach(() => {
  vi.doUnmock("@/server/repositories/prompt-repository")
  vi.resetModules()
})

describe("mapping des suggestions Prompts", () => {
  it(
    scenario(
      "Le service borne les suggestions à trois DTO PromptCard publics",
      "trois rows publiques valides renvoyées par le repository",
      "getRelatedPrompts reçoit le domaine et l'id du prompt courant",
      "le repository reçoit take 3 et les trois rows sont parsées puis retournées sans décision d'entitlement",
    ),
    async () => {
      const rows = [
        PUBLIC_CARD,
        { ...PUBLIC_CARD, id: "related-2", slug: "related-2" },
        { ...PUBLIC_CARD, id: "related-3", slug: "related-3" },
      ]
      const findRelatedByDomain = vi.fn().mockResolvedValue(rows)
      vi.doMock("@/server/repositories/prompt-repository", () => ({
        findBySlug: vi.fn(),
        findMany: vi.fn(),
        findMetaBySlug: vi.fn(),
        findRelatedByDomain,
      }))
      const service = await loadRelatedService()

      const result = await service.getRelatedPrompts({
        domain: "ia",
        excludeId: "prompt-courant",
      })

      expect(findRelatedByDomain).toHaveBeenCalledWith({
        domain: "ia",
        excludeId: "prompt-courant",
        take: 3,
      })
      expect(result).toEqual(rows)
    },
  )

  it(
    scenario(
      "Le service refuse toute suggestion qui n'est pas un PromptCard strict",
      "une row de suggestion contenant accidentellement un body Premium",
      "getRelatedPrompts parse la réponse du repository",
      "la promesse est rejetée par Zod au lieu de propager le champ verrouillé",
    ),
    async () => {
      const findRelatedByDomain = vi
        .fn()
        .mockResolvedValue([{ ...PUBLIC_CARD, body: "BODY-PREMIUM-INTERDIT" }])
      vi.doMock("@/server/repositories/prompt-repository", () => ({
        findBySlug: vi.fn(),
        findMany: vi.fn(),
        findMetaBySlug: vi.fn(),
        findRelatedByDomain,
      }))
      const service = await loadRelatedService()

      await expect(
        service.getRelatedPrompts({
          domain: "ia",
          excludeId: "prompt-courant",
        }),
      ).rejects.toMatchObject({ name: "ZodError" })
    },
  )
})
