import { afterEach, describe, expect, it, vi } from "vitest"

type HomeService = {
  getHomePageData: () => Promise<unknown>
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

function isHomeService(value: unknown): value is HomeService {
  return isRecord(value) && typeof value.getHomePageData === "function"
}

async function loadService(): Promise<HomeService> {
  const modulePath = "@/server/services/home-service"
  const module: unknown = await import(modulePath)
  if (!isHomeService(module)) {
    throw new Error("home-service doit exporter getHomePageData")
  }
  return module
}

describe("service de l'accueil", () => {
  afterEach(() => {
    vi.doUnmock("@/server/repositories/home-repository")
    vi.resetModules()
  })

  it(
    scenario(
      "Les agrégats deviennent les quatre entrées éditoriales de l'accueil",
      "un repository qui retourne des compteurs distincts et deux prompts récents",
      "le service construit le DTO de l'accueil",
      "les quatre rubriques gardent leur compteur, leur nom et leur lien, et les contenus récents restent filtrés",
    ),
    async () => {
      const getHomeOverview = vi.fn().mockResolvedValue({
        counts: {
          formations: 3,
          jeux: 2,
          opportunites: 5,
          prompts: 24,
        },
        recentPrompts: [
          {
            id: "prompt-2",
            slug: "prompt-recent-2",
            summary: "Résumé récent 2",
            title: "Prompt récent 2",
          },
          {
            id: "prompt-1",
            slug: "prompt-recent-1",
            summary: "Résumé récent 1",
            title: "Prompt récent 1",
          },
        ],
      })
      vi.doMock("@/server/repositories/home-repository", () => ({
        getHomeOverview,
      }))
      const service = await loadService()

      const result = await service.getHomePageData()

      expect(getHomeOverview).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        recent: [
          {
            href: "/prompts/prompt-recent-2",
            id: "prompt-2",
            rubric: "Prompts",
            summary: "Résumé récent 2",
            title: "Prompt récent 2",
          },
          {
            href: "/prompts/prompt-recent-1",
            id: "prompt-1",
            rubric: "Prompts",
            summary: "Résumé récent 1",
            title: "Prompt récent 1",
          },
        ],
        sections: [
          {
            count: 24,
            href: "/prompts",
            key: "prompts",
            title: "Prompts",
          },
          {
            count: 3,
            href: "/formations",
            key: "formations",
            title: "Formations",
          },
          {
            count: 2,
            href: "/jeux",
            key: "jeux",
            title: "Jeux & concours",
          },
          {
            count: 5,
            href: "/opportunites",
            key: "opportunites",
            title: "Bons plans & opportunités",
          },
        ],
      })
    },
  )

  it(
    scenario(
      "Une base vide reste une vraie page d'accueil vide",
      "un repository qui retourne quatre compteurs nuls et aucun contenu récent",
      "le service construit le DTO",
      "les quatre rubriques restent présentes à 0 et la mise en avant reste vide sans contenu inventé",
    ),
    async () => {
      const getHomeOverview = vi.fn().mockResolvedValue({
        counts: {
          formations: 0,
          jeux: 0,
          opportunites: 0,
          prompts: 0,
        },
        recentPrompts: [],
      })
      vi.doMock("@/server/repositories/home-repository", () => ({
        getHomeOverview,
      }))
      const service = await loadService()

      const result = await service.getHomePageData()

      expect(getHomeOverview).toHaveBeenCalledTimes(1)
      expect(result).toEqual(
        expect.objectContaining({
          recent: [],
          sections: expect.arrayContaining([
            expect.objectContaining({ count: 0, key: "prompts" }),
            expect.objectContaining({ count: 0, key: "formations" }),
            expect.objectContaining({ count: 0, key: "jeux" }),
            expect.objectContaining({ count: 0, key: "opportunites" }),
          ]),
        }),
      )
    },
  )
})
