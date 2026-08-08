import { afterEach, describe, expect, it, vi } from "vitest"

import { scenario } from "../repositories/replicated-content-fixtures"

type ListRoute = Readonly<{
  GET: (request: Request) => Promise<Response> | Response
}>

type DetailRoute = Readonly<{
  GET: (
    request: Request,
    context: Readonly<{ params: Promise<Record<string, unknown>> }>,
  ) => Promise<Response> | Response
}>

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isListRoute(value: unknown): value is ListRoute {
  return isRecord(value) && typeof value.GET === "function"
}

function isDetailRoute(value: unknown): value is DetailRoute {
  return isRecord(value) && typeof value.GET === "function"
}

function listRouteOf(value: unknown): ListRoute {
  if (!isListRoute(value)) {
    throw new Error("la route de liste doit exporter GET")
  }
  return value
}

function detailRouteOf(value: unknown): DetailRoute {
  if (!isDetailRoute(value)) {
    throw new Error("la route de détail doit exporter GET")
  }
  return value
}

function expectLoggedBadRequest(
  raw: string,
  writeLog: ReturnType<typeof vi.fn>,
  forbiddenDetails: RegExp,
): void {
  const payload: unknown = JSON.parse(raw)
  if (!isRecord(payload)) {
    throw new Error("l'erreur de query doit être un objet JSON")
  }
  expect(payload.errorId).toMatch(UUID_V4_PATTERN)
  expect(writeLog).toHaveBeenCalledWith(
    expect.objectContaining({ errorId: payload.errorId, status: 400 }),
  )
  expect(raw).not.toMatch(forbiddenDetails)
}

async function formationListRoute(): Promise<ListRoute> {
  return listRouteOf(await import("@/app/api/formations/route"))
}

async function opportuniteListRoute(): Promise<ListRoute> {
  return listRouteOf(await import("@/app/api/opportunites/route"))
}

async function formationDetailRoute(): Promise<DetailRoute> {
  return detailRouteOf(await import("@/app/api/formations/[slug]/route"))
}

async function opportuniteDetailRoute(): Promise<DetailRoute> {
  return detailRouteOf(await import("@/app/api/opportunites/[slug]/route"))
}

afterEach(() => {
  vi.doUnmock("@/server/auth/config")
  vi.doUnmock("@/server/services/formation-service")
  vi.doUnmock("@/server/services/opportunite-service")
  vi.doUnmock("@/server/logger")
  vi.restoreAllMocks()
  vi.resetModules()
})

describe("Route Handlers Formations et Opportunités", () => {
  it(
    scenario(
      "La liste Formations valide strictement nature, niveau et pagination",
      "une query kind EVENEMENTIELLE, level DEBUTANT, curseur et take 12",
      "GET /api/formations parse la frontière puis appelle le service",
      "la réponse 200 est la page JSON brute et un champ inconnu produit 400 avec errorId corrélé au log, sans appel service ni détail Zod",
    ),
    async () => {
      const page = { items: [], nextCursor: null }
      const getFormations = vi.fn().mockResolvedValue(page)
      const writeLog = vi.fn()
      vi.doMock("@/server/services/formation-service", () => ({
        getFormations,
      }))
      vi.doMock("@/server/logger", () => ({ writeLog }))
      const route = await formationListRoute()

      const response = await route.GET(
        new Request(
          "http://localhost/api/formations?kind=EVENEMENTIELLE&level=DEBUTANT&cursor=avant&take=12",
        ),
      )
      const invalid = await route.GET(
        new Request("http://localhost/api/formations?membership=PREMIUM"),
      )
      const invalidRaw = await invalid.text()

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual(page)
      expect(getFormations).toHaveBeenCalledWith({
        cursor: "avant",
        kind: "EVENEMENTIELLE",
        level: "DEBUTANT",
        take: 12,
      })
      expect(invalid.status).toBe(400)
      expect(getFormations).toHaveBeenCalledTimes(1)
      expectLoggedBadRequest(
        invalidRaw,
        writeLog,
        /membership|PREMIUM|Zod|issues|stack/i,
      )
    },
  )

  it(
    scenario(
      "La liste Opportunités valide strictement type, recherche et pagination",
      "une query type STAGE, recherche abidjan, curseur et take 12",
      "GET /api/opportunites parse la frontière puis appelle le service",
      "la réponse 200 est la page JSON brute et un type hors enum produit 400 avec errorId corrélé au log, sans second appel service ni détail Zod",
    ),
    async () => {
      const page = { items: [], nextCursor: null }
      const getOpportunites = vi.fn().mockResolvedValue(page)
      const writeLog = vi.fn()
      vi.doMock("@/server/services/opportunite-service", () => ({
        getOpportunites,
      }))
      vi.doMock("@/server/logger", () => ({ writeLog }))
      const route = await opportuniteListRoute()

      const response = await route.GET(
        new Request(
          "http://localhost/api/opportunites?type=STAGE&search=abidjan&cursor=avant&take=12",
        ),
      )
      const invalid = await route.GET(
        new Request("http://localhost/api/opportunites?type=INVENTE"),
      )
      const invalidRaw = await invalid.text()

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual(page)
      expect(getOpportunites).toHaveBeenCalledWith({
        cursor: "avant",
        search: "abidjan",
        take: 12,
        type: "STAGE",
      })
      expect(invalid.status).toBe(400)
      expect(getOpportunites).toHaveBeenCalledTimes(1)
      expectLoggedBadRequest(invalidRaw, writeLog, /INVENTE|Zod|issues|stack/i)
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
      "Le JSON brut Formation d'un %s ne contient jamais le programme premium",
      "un teaser PREMIUM et une identité serveur non entitled",
      "GET /api/formations/[slug] est appelé",
      "la réponse 200 contient excerpt et kind, sans clé body ni sentinelle",
    ),
    async (_actor, user) => {
      const teaser = {
        excerpt: "Extrait public",
        kind: "PERMANENTE",
        slug: "formation-premium",
        visibility: "PREMIUM",
      }
      const auth = vi
        .fn()
        .mockResolvedValue(
          user ? { expires: "2099-01-01T00:00:00.000Z", user } : null,
        )
      const getFormationBySlug = vi.fn().mockResolvedValue(teaser)
      vi.doMock("@/server/auth/config", () => ({ auth }))
      vi.doMock("@/server/services/formation-service", () => ({
        getFormationBySlug,
      }))
      const route = await formationDetailRoute()

      const response = await route.GET(
        new Request("http://localhost/api/formations/formation-premium"),
        { params: Promise.resolve({ slug: "formation-premium" }) },
      )
      const raw = await response.text()

      expect(response.status).toBe(200)
      expect(JSON.parse(raw)).toEqual(teaser)
      expect(raw).not.toMatch(/"body"|PROGRAMME-SECRET/u)
      expect(getFormationBySlug).toHaveBeenCalledWith("formation-premium", user)
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
      "Le JSON brut Opportunité d'un %s exclut body et externalUrl premium",
      "un teaser PREMIUM et une identité serveur non entitled",
      "GET /api/opportunites/[slug] est appelé",
      "la réponse 200 contient l'excerpt mais aucune clé body ou externalUrl ni leurs sentinelles",
    ),
    async (_actor, user) => {
      const teaser = {
        excerpt: "Extrait public",
        organisme: "Synapse",
        slug: "opportunite-premium",
        visibility: "PREMIUM",
      }
      vi.doMock("@/server/auth/config", () => ({
        auth: vi
          .fn()
          .mockResolvedValue(
            user ? { expires: "2099-01-01T00:00:00.000Z", user } : null,
          ),
      }))
      const getOpportuniteBySlug = vi.fn().mockResolvedValue(teaser)
      vi.doMock("@/server/services/opportunite-service", () => ({
        getOpportuniteBySlug,
      }))
      const route = await opportuniteDetailRoute()

      const response = await route.GET(
        new Request("http://localhost/api/opportunites/opportunite-premium"),
        { params: Promise.resolve({ slug: "opportunite-premium" }) },
      )
      const raw = await response.text()

      expect(response.status).toBe(200)
      expect(JSON.parse(raw)).toEqual(teaser)
      expect(raw).not.toMatch(/"body"|"externalUrl"|BODY-SECRET|URL-SECRET/u)
      expect(getOpportuniteBySlug).toHaveBeenCalledWith(
        "opportunite-premium",
        user,
      )
    },
  )

  it(
    scenario(
      "Une opportunité expirée produit une erreur 404 générique sans archive",
      "le service ne trouve pas le slug d'une opportunité après deadline",
      "GET /api/opportunites/[slug] traite l'erreur domaine",
      "la réponse vaut 404 avec errorId et ne révèle ni slug, ni URL, ni détail Prisma",
    ),
    async () => {
      const errors: unknown = await import("@/server/errors")
      if (
        !isRecord(errors) ||
        typeof errors.ContentNotFoundError !== "function"
      ) {
        throw new Error("ContentNotFoundError doit être exportée")
      }
      const error = Reflect.construct(errors.ContentNotFoundError, [
        "opportunite",
        "expiree-secrete",
      ])
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue(null),
      }))
      vi.doMock("@/server/services/opportunite-service", () => ({
        getOpportuniteBySlug: vi.fn().mockRejectedValue(error),
      }))
      const route = await opportuniteDetailRoute()

      const response = await route.GET(
        new Request("http://localhost/api/opportunites/expiree-secrete"),
        { params: Promise.resolve({ slug: "expiree-secrete" }) },
      )
      const raw = await response.text()

      expect(response.status).toBe(404)
      expect(raw).toMatch(/errorId/u)
      expect(raw).not.toMatch(/expiree-secrete|Prisma|stack|externalUrl/i)
    },
  )
})
