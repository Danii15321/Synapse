import { afterEach, describe, expect, it, vi } from "vitest"

type PromptDomain = "ia" | "entrepreneuriat" | "productivite" | "communication"

type ListQuery = Readonly<{
  cursor?: string
  domain?: PromptDomain
  search?: string
  tag?: string
  take: number
}>

type PromptServiceModule = Readonly<{
  getPrompts: (query: ListQuery) => Promise<unknown>
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

function isServiceModule(value: unknown): value is PromptServiceModule {
  return isRecord(value) && typeof value.getPrompts === "function"
}

async function loadService(): Promise<PromptServiceModule> {
  const module: unknown = await import("@/server/services/prompt-service")
  if (!isServiceModule(module)) {
    throw new Error("prompt-service doit exporter getPrompts")
  }
  return module
}

afterEach(() => {
  vi.doUnmock("@/server/repositories/prompt-repository")
  vi.resetModules()
})

describe("service du catalogue Prompts", () => {
  it(
    scenario(
      "Les filtres validés descendent au repository et la page ne contient que les DTO de carte",
      "une requête domain, tag et recherche avec take 2, et trois rows publiques",
      "le service construit la première page du catalogue",
      "le repository reçoit les filtres et take+1, deux cartes sans body sont retournées avec un nextCursor utilisable",
    ),
    async () => {
      const rows = [
        {
          coverImage: "/images/prompts/un.webp",
          domain: "ia",
          id: "prompt-1",
          slug: "prompt-1",
          summary: "Résumé 1",
          tags: ["strategie"],
          title: "Prompt 1",
          visibility: "FREE",
        },
        {
          coverImage: null,
          domain: "ia",
          id: "prompt-2",
          slug: "prompt-2",
          summary: "Résumé 2",
          tags: ["strategie"],
          title: "Prompt 2",
          visibility: "PREMIUM",
        },
        {
          coverImage: null,
          domain: "ia",
          id: "prompt-3",
          slug: "prompt-3",
          summary: "Résumé 3",
          tags: ["strategie"],
          title: "Prompt 3",
          visibility: "FREE",
        },
      ] as const
      const findMany = vi.fn().mockResolvedValue(rows)
      vi.doMock("@/server/repositories/prompt-repository", () => ({
        findMany,
      }))
      const service = await loadService()
      const query = {
        domain: "ia",
        search: "plan",
        tag: "strategie",
        take: 2,
      } as const

      const result = await service.getPrompts(query)

      expect(findMany).toHaveBeenCalledWith({ ...query, take: 3 })
      expect(result).toEqual({
        items: rows.slice(0, 2),
        nextCursor: "prompt-2",
      })
      expect(JSON.stringify(result)).not.toMatch(/"body"|"excerpt"/)
    },
  )

  it(
    scenario(
      "La dernière page annonce explicitement la fin de la pagination",
      "une requête avec curseur et moins de rows que la taille demandée",
      "le service construit la page suivante",
      "toutes les rows sont mappées et nextCursor vaut null afin que le client n'invente pas une requête supplémentaire",
    ),
    async () => {
      const row = {
        coverImage: null,
        domain: "communication",
        id: "prompt-final",
        slug: "prompt-final",
        summary: "Dernier résumé",
        tags: ["oral"],
        title: "Dernier prompt",
        visibility: "FREE",
      } as const
      const findMany = vi.fn().mockResolvedValue([row])
      vi.doMock("@/server/repositories/prompt-repository", () => ({
        findMany,
      }))
      const service = await loadService()

      const result = await service.getPrompts({
        cursor: "prompt-précédent",
        take: 20,
      })

      expect(findMany).toHaveBeenCalledWith({
        cursor: "prompt-précédent",
        take: 21,
      })
      expect(result).toEqual({ items: [row], nextCursor: null })
    },
  )
})
