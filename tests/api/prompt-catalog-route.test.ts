import { afterEach, describe, expect, it, vi } from "vitest"

type RouteModule = Readonly<{
  GET: (request: Request) => Promise<Response> | Response
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

function isRouteModule(value: unknown): value is RouteModule {
  return isRecord(value) && typeof value.GET === "function"
}

async function loadRoute(): Promise<RouteModule> {
  const module: unknown = await import("@/app/api/prompts/route")
  if (!isRouteModule(module)) {
    throw new Error("GET /api/prompts doit exporter GET")
  }
  return module
}

afterEach(() => {
  vi.doUnmock("@/server/services/prompt-service")
  vi.resetModules()
})

describe("Route Handler du catalogue Prompts", () => {
  it(
    scenario(
      "La pagination, les filtres et la recherche validés produisent une page JSON brute",
      "une URL avec domain ia, tag strategie, search plan, cursor et take 24",
      "GET /api/prompts parse la query puis appelle le service",
      "la réponse 200 sérialise items et nextCursor, et le service reçoit uniquement les valeurs validées",
    ),
    async () => {
      const page = {
        items: [
          {
            coverImage: null,
            domain: "ia",
            id: "prompt-1",
            slug: "prompt-1",
            summary: "Résumé public",
            tags: ["strategie"],
            title: "Plan IA",
            visibility: "FREE",
          },
        ],
        nextCursor: "prompt-1",
      } as const
      const getPrompts = vi.fn().mockResolvedValue(page)
      vi.doMock("@/server/services/prompt-service", () => ({ getPrompts }))
      const route = await loadRoute()
      const request = new Request(
        "http://localhost/api/prompts?domain=ia&tag=strategie&search=plan&cursor=avant-1&take=24",
      )

      const response = await route.GET(request)
      const raw = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toMatch(
        /^application\/json\b/i,
      )
      expect(getPrompts).toHaveBeenCalledWith({
        cursor: "avant-1",
        domain: "ia",
        search: "plan",
        tag: "strategie",
        take: 24,
      })
      expect(JSON.parse(raw)).toEqual(page)
      expect(raw).not.toMatch(/"body"|"excerpt"/)
    },
  )

  it.each([
    ["un domaine hors enum", "domain=marketing"],
    ["un champ inconnu", "domain=ia&membership=PREMIUM"],
  ])(
    scenario(
      "Une query invalide est refusée par une frontière Zod stricte",
      "%s dans les paramètres publics de liste",
      "GET /api/prompts reçoit cette query",
      "la réponse vaut 400 avec un message générique et le service n'est jamais appelé",
    ),
    async (_label, query) => {
      const getPrompts = vi.fn()
      vi.doMock("@/server/services/prompt-service", () => ({ getPrompts }))
      const route = await loadRoute()

      const response = await route.GET(
        new Request(`http://localhost/api/prompts?${query}`),
      )
      const raw = await response.text()

      expect(response.status).toBe(400)
      expect(getPrompts).not.toHaveBeenCalled()
      expect(raw).not.toMatch(/marketing|membership|Zod|stack|Prisma/i)
    },
  )
})
