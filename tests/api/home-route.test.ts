import { afterEach, describe, expect, it, vi } from "vitest"

type HomeRoute = {
  GET: () => Response | Promise<Response>
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

function isHomeRoute(value: unknown): value is HomeRoute {
  return isRecord(value) && typeof value.GET === "function"
}

async function loadRoute(): Promise<HomeRoute> {
  const modulePath = "@/app/api/home/route"
  const module: unknown = await import(modulePath)
  if (!isHomeRoute(module)) {
    throw new Error("GET /api/home doit exporter GET")
  }
  return module
}

describe("BFF de l'accueil", () => {
  afterEach(() => {
    vi.doUnmock("@/server/services/home-service")
    vi.resetModules()
  })

  it(
    scenario(
      "GET /api/home sérialise le DTO agrégé",
      "un service qui retourne les quatre rubriques et un contenu récent",
      "le Route Handler reçoit une requête GET",
      "la réponse HTTP brute vaut 200, annonce du JSON et contient exactement le DTO du service",
    ),
    async () => {
      const dto = {
        recent: [
          {
            href: "/prompts/recent",
            id: "recent",
            rubric: "Prompts",
            summary: "Résumé",
            title: "Récent",
          },
        ],
        sections: [
          { count: 1, href: "/prompts", key: "prompts", title: "Prompts" },
          {
            count: 0,
            href: "/formations",
            key: "formations",
            title: "Formations",
          },
          {
            count: 0,
            href: "/jeux",
            key: "jeux",
            title: "Jeux & concours",
          },
          {
            count: 0,
            href: "/opportunites",
            key: "opportunites",
            title: "Bons plans & opportunités",
          },
        ],
      }
      const getHomePageData = vi.fn().mockResolvedValue(dto)
      vi.doMock("@/server/services/home-service", () => ({ getHomePageData }))
      const route = await loadRoute()

      const response = await route.GET()
      const rawBody = await response.text()

      expect(getHomePageData).toHaveBeenCalledTimes(1)
      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toMatch(
        /^application\/json\b/i,
      )
      expect(JSON.parse(rawBody)).toEqual(dto)
    },
  )

  it(
    scenario(
      "GET /api/home masque une erreur interne",
      "un service qui échoue avec un message contenant une sentinelle sensible",
      "le Route Handler traite la requête",
      "la réponse HTTP brute vaut 500 et expose seulement un message générique avec un errorId UUID",
    ),
    async () => {
      const sentinel = "DATABASE_URL=postgresql://secret-interne"
      vi.doMock("@/server/services/home-service", () => ({
        getHomePageData: vi.fn().mockRejectedValue(new Error(sentinel)),
      }))
      const route = await loadRoute()

      const response = await route.GET()
      const rawBody = await response.text()
      const parsed: unknown = JSON.parse(rawBody)

      expect(response.status).toBe(500)
      expect(rawBody).not.toContain(sentinel)
      expect(parsed).toEqual({
        errorId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        message: expect.stringMatching(/erreur|indisponible/i),
      })
    },
  )
})
