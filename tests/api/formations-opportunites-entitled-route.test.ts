import { afterEach, describe, expect, it, vi } from "vitest"

type DetailRoute = Readonly<{
  GET: (
    request: Request,
    context: Readonly<{ params: Promise<Record<string, unknown>> }>,
  ) => Promise<Response> | Response
}>

function scenario(name: string, given: string, when: string, then: string) {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

function isDetailRoute(value: unknown): value is DetailRoute {
  return (
    typeof value === "object" &&
    value !== null &&
    "GET" in value &&
    typeof value.GET === "function"
  )
}

function routeOf(value: unknown): DetailRoute {
  if (!isDetailRoute(value))
    throw new Error("la route détail doit exporter GET")
  return value
}

const PREMIUM_USER = {
  email: "premium@example.test",
  id: "premium",
  membership: "PREMIUM",
}

afterEach(() => {
  vi.doUnmock("@/server/auth/config")
  vi.doUnmock("@/server/services/formation-service")
  vi.doUnmock("@/server/services/opportunite-service")
  vi.resetModules()
})

describe("détails HTTP entitled et paramètres stricts", () => {
  it(
    scenario(
      "Un membre PREMIUM reçoit le programme Formation complet dans le JSON brut",
      "une session database PREMIUM et un DTO FormationFull",
      "GET /api/formations/[slug] est appelé",
      "l'utilisateur serveur est transmis et la réponse 200 contient exactement body",
    ),
    async () => {
      const full = {
        body: "PROGRAMME COMPLET",
        kind: "EVENEMENTIELLE",
        slug: "formation-premium",
        visibility: "PREMIUM",
      }
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue({
          expires: "2099-01-01T00:00:00.000Z",
          user: PREMIUM_USER,
        }),
      }))
      const getFormationBySlug = vi.fn().mockResolvedValue(full)
      vi.doMock("@/server/services/formation-service", () => ({
        getFormationBySlug,
      }))
      const route = routeOf(await import("@/app/api/formations/[slug]/route"))

      const response = await route.GET(
        new Request("http://localhost/api/formations/formation-premium"),
        { params: Promise.resolve({ slug: "formation-premium" }) },
      )

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual(full)
      expect(getFormationBySlug).toHaveBeenCalledWith(
        "formation-premium",
        PREMIUM_USER,
      )
    },
  )

  it(
    scenario(
      "Un membre PREMIUM reçoit ensemble body et externalUrl Opportunité",
      "une session database PREMIUM et un DTO OpportuniteFull",
      "GET /api/opportunites/[slug] est appelé",
      "la réponse 200 contient sans altération le corps et le lien de candidature",
    ),
    async () => {
      const full = {
        body: "DOSSIER COMPLET",
        externalUrl: "https://example.test/postuler",
        slug: "opportunite-premium",
        visibility: "PREMIUM",
      }
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue({
          expires: "2099-01-01T00:00:00.000Z",
          user: PREMIUM_USER,
        }),
      }))
      const getOpportuniteBySlug = vi.fn().mockResolvedValue(full)
      vi.doMock("@/server/services/opportunite-service", () => ({
        getOpportuniteBySlug,
      }))
      const route = routeOf(await import("@/app/api/opportunites/[slug]/route"))

      const response = await route.GET(
        new Request("http://localhost/api/opportunites/opportunite-premium"),
        { params: Promise.resolve({ slug: "opportunite-premium" }) },
      )

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual(full)
      expect(getOpportuniteBySlug).toHaveBeenCalledWith(
        "opportunite-premium",
        PREMIUM_USER,
      )
    },
  )

  it.each(["formations", "opportunites"])(
    scenario(
      "Un membership forgé dans les paramètres de détail %s est refusé",
      "un slug valide accompagné d'un champ inconnu membership",
      "le handler valide les params par Zod strict",
      "la réponse vaut 400 avant tout appel du service",
    ),
    async (resource) => {
      const getBySlug = vi.fn()
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue(null),
      }))
      vi.doMock("@/server/services/formation-service", () => ({
        getFormationBySlug: getBySlug,
      }))
      vi.doMock("@/server/services/opportunite-service", () => ({
        getOpportuniteBySlug: getBySlug,
      }))
      const route =
        resource === "formations"
          ? routeOf(await import("@/app/api/formations/[slug]/route"))
          : routeOf(await import("@/app/api/opportunites/[slug]/route"))

      const response = await route.GET(
        new Request(`http://localhost/api/${resource}/contenu-premium`),
        {
          params: Promise.resolve({
            membership: "PREMIUM",
            slug: "contenu-premium",
          }),
        },
      )

      expect(response.status).toBe(400)
      expect(getBySlug).not.toHaveBeenCalled()
    },
  )
})
