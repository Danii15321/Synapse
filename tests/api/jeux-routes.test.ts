import { afterEach, describe, expect, it, vi } from "vitest"

import { isRecord, scenario } from "../repositories/jeux-inscriptions-fixtures"

type ListRoute = Readonly<{
  GET: (request: Request) => Promise<Response> | Response
}>

type DetailRoute = Readonly<{
  GET: (
    request: Request,
    context: Readonly<{ params: Promise<Record<string, unknown>> }>,
  ) => Promise<Response> | Response
}>

function isListRoute(value: unknown): value is ListRoute {
  return isRecord(value) && typeof value.GET === "function"
}

function isDetailRoute(value: unknown): value is DetailRoute {
  return isRecord(value) && typeof value.GET === "function"
}

function listRouteOf(value: unknown): ListRoute {
  if (!isListRoute(value)) {
    throw new Error("GET /api/jeux doit être exporté")
  }
  return value
}

function detailRouteOf(value: unknown): DetailRoute {
  if (!isDetailRoute(value)) {
    throw new Error("GET /api/jeux/[slug] doit être exporté")
  }
  return value
}

afterEach(() => {
  vi.doUnmock("@/server/auth/config")
  vi.doUnmock("@/server/services/jeu-service")
  vi.resetModules()
})

describe("Route Handlers de la rubrique Jeux et concours", () => {
  it(
    scenario(
      "La liste Jeux valide strictement sa pagination",
      "une query avec curseur et take 12 puis une query contenant membership forgé",
      "GET /api/jeux parse chaque frontière",
      "la query valide produit la page brute et le champ inconnu vaut 400 sans appel service supplémentaire",
    ),
    async () => {
      const page = { items: [], nextCursor: null }
      const getJeux = vi.fn().mockResolvedValue(page)
      vi.doMock("@/server/services/jeu-service", () => ({ getJeux }))
      const route = listRouteOf(await import("@/app/api/jeux/route"))

      const response = await route.GET(
        new Request("http://localhost/api/jeux?cursor=avant&take=12"),
      )
      const invalid = await route.GET(
        new Request("http://localhost/api/jeux?membership=PREMIUM"),
      )

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual(page)
      expect(getJeux).toHaveBeenCalledWith({ cursor: "avant", take: 12 })
      expect(invalid.status).toBe(400)
      expect(getJeux).toHaveBeenCalledTimes(1)
    },
  )

  it.each([
    ["anonyme", null],
    [
      "membre FREE",
      { email: "free@example.test", id: "free", membership: "FREE" },
    ],
  ])(
    scenario(
      "Le JSON brut d'un concours PREMIUM reste verrouillé pour un %s",
      "un teaser PREMIUM avec excerpt et une identité serveur non entitled",
      "GET /api/jeux/[slug] sérialise le DTO reçu du service",
      "la réponse contient les métadonnées publiques sans clé body ni règles sentinelles",
    ),
    async (_actor, user) => {
      const teaser = {
        capacity: 30,
        closesAt: "2026-12-11T23:59:59.000Z",
        excerpt: "Un aperçu du challenge",
        location: "Abidjan",
        slug: "challenge-premium",
        startsAt: "2026-12-12T10:00:00.000Z",
        title: "Challenge premium",
        visibility: "PREMIUM",
      }
      vi.doMock("@/server/auth/config", () => ({
        auth: vi
          .fn()
          .mockResolvedValue(
            user ? { expires: "2099-01-01T00:00:00.000Z", user } : null,
          ),
      }))
      const getJeuBySlug = vi.fn().mockResolvedValue(teaser)
      vi.doMock("@/server/services/jeu-service", () => ({ getJeuBySlug }))
      const route = detailRouteOf(await import("@/app/api/jeux/[slug]/route"))

      const response = await route.GET(
        new Request("http://localhost/api/jeux/challenge-premium"),
        { params: Promise.resolve({ slug: "challenge-premium" }) },
      )
      const raw = await response.text()

      expect(response.status).toBe(200)
      expect(JSON.parse(raw)).toEqual(teaser)
      expect(raw).not.toMatch(/"body"|REGLES-SECRETES/u)
      expect(getJeuBySlug).toHaveBeenCalledWith("challenge-premium", user)
    },
  )
})
