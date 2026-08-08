import { afterEach, describe, expect, it, vi } from "vitest"

type PromptServiceModule = {
  getPrompts: (query: Readonly<{ take: number }>) => Promise<unknown>
}

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

function isPromptServiceModule(value: unknown): value is PromptServiceModule {
  return isRecord(value) && typeof value.getPrompts === "function"
}

async function loadService(): Promise<PromptServiceModule> {
  const module: unknown = await import("@/server/services/prompt-service")

  if (!isPromptServiceModule(module)) {
    throw new Error("prompt-service doit exporter getPrompts")
  }

  return module
}

describe("service de liste des prompts", () => {
  afterEach(() => {
    vi.doUnmock("@/server/repositories/prompt-repository")
    vi.resetModules()
  })

  it(
    scenario(
      "Les rows repository sont mappées vers des DTO publics",
      "deux rows en mémoire contenant uniquement les métadonnées publiques de carte",
      "le service construit la liste des prompts",
      "il retourne une page stable avec les cartes, domain et coverImage nullable, sans contenu verrouillé",
    ),
    async () => {
      const repositoryFindMany = vi.fn().mockResolvedValue([
        {
          coverImage: null,
          domain: "ia",
          id: "prompt-1",
          slug: "premier-prompt",
          title: "Premier prompt",
          summary: "Premier résumé",
          tags: ["test"],
          visibility: "FREE",
        },
        {
          coverImage: "/images/prompts/deuxieme.webp",
          domain: "communication",
          id: "prompt-2",
          slug: "deuxieme-prompt",
          title: "Deuxième prompt",
          summary: "Deuxième résumé",
          tags: ["oral"],
          visibility: "PREMIUM",
        },
      ])
      vi.doMock("@/server/repositories/prompt-repository", () => ({
        findMany: repositoryFindMany,
      }))
      const service = await loadService()

      const result = await service.getPrompts({ take: 24 })

      expect(repositoryFindMany).toHaveBeenCalledWith({ take: 25 })
      expect(result).toEqual({
        items: [
          {
            coverImage: null,
            domain: "ia",
            id: "prompt-1",
            slug: "premier-prompt",
            summary: "Premier résumé",
            tags: ["test"],
            title: "Premier prompt",
            visibility: "FREE",
          },
          {
            coverImage: "/images/prompts/deuxieme.webp",
            domain: "communication",
            id: "prompt-2",
            slug: "deuxieme-prompt",
            summary: "Deuxième résumé",
            tags: ["oral"],
            title: "Deuxième prompt",
            visibility: "PREMIUM",
          },
        ],
        nextCursor: null,
      })
    },
  )

  it(
    scenario(
      "Une base sans prompt produit un DTO de liste vide",
      "un repository qui retourne un tableau vide en mémoire",
      "le service construit la liste des prompts",
      "il retourne exactement une page vide terminée sans inventer de contenu",
    ),
    async () => {
      const repositoryFindMany = vi.fn().mockResolvedValue([])
      vi.doMock("@/server/repositories/prompt-repository", () => ({
        findMany: repositoryFindMany,
      }))
      const service = await loadService()

      const result = await service.getPrompts({ take: 24 })

      expect(repositoryFindMany).toHaveBeenCalledWith({ take: 25 })
      expect(result).toEqual({ items: [], nextCursor: null })
    },
  )
})
