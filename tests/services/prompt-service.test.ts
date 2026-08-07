import { afterEach, describe, expect, it, vi } from "vitest"

type PromptServiceModule = {
  getPrompts: () => Promise<unknown>
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
      "deux rows en mémoire comprenant les timestamps techniques du modèle",
      "le service construit la liste des prompts",
      "il retourne les quatre champs publics de chaque DTO dans le même ordre et omet les timestamps",
    ),
    async () => {
      const repositoryFindMany = vi.fn().mockResolvedValue([
        {
          id: "prompt-1",
          slug: "premier-prompt",
          title: "Premier prompt",
          summary: "Premier résumé",
          createdAt: new Date("2026-08-01T10:00:00.000Z"),
          updatedAt: new Date("2026-08-02T10:00:00.000Z"),
        },
        {
          id: "prompt-2",
          slug: "deuxieme-prompt",
          title: "Deuxième prompt",
          summary: "Deuxième résumé",
          createdAt: new Date("2026-08-03T10:00:00.000Z"),
          updatedAt: new Date("2026-08-04T10:00:00.000Z"),
        },
      ])
      vi.doMock("@/server/repositories/prompt-repository", () => ({
        findMany: repositoryFindMany,
      }))
      const service = await loadService()

      const result = await service.getPrompts()

      expect(repositoryFindMany).toHaveBeenCalledTimes(1)
      expect(result).toEqual([
        {
          id: "prompt-1",
          slug: "premier-prompt",
          summary: "Premier résumé",
          title: "Premier prompt",
        },
        {
          id: "prompt-2",
          slug: "deuxieme-prompt",
          summary: "Deuxième résumé",
          title: "Deuxième prompt",
        },
      ])
    },
  )

  it(
    scenario(
      "Une base sans prompt produit un DTO de liste vide",
      "un repository qui retourne un tableau vide en mémoire",
      "le service construit la liste des prompts",
      "il retourne exactement un tableau vide sans inventer de contenu",
    ),
    async () => {
      const repositoryFindMany = vi.fn().mockResolvedValue([])
      vi.doMock("@/server/repositories/prompt-repository", () => ({
        findMany: repositoryFindMany,
      }))
      const service = await loadService()

      const result = await service.getPrompts()

      expect(repositoryFindMany).toHaveBeenCalledTimes(1)
      expect(result).toEqual([])
    },
  )
})
