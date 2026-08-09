import { afterEach, describe, expect, it, vi } from "vitest"

import { UnauthorizedError } from "@/server/errors"

import { isRecord, scenario } from "../repositories/jeux-inscriptions-fixtures"
import { expectGenericApiError } from "./inscription-route-fixtures"

type MutationRoute = Readonly<{
  DELETE: (
    request: Request,
    context: Readonly<{ params: Promise<Record<string, unknown>> }>,
  ) => Promise<Response> | Response
  POST: (
    request: Request,
    context: Readonly<{ params: Promise<Record<string, unknown>> }>,
  ) => Promise<Response> | Response
}>

type ListRoute = Readonly<{
  GET: (request: Request) => Promise<Response> | Response
}>

function isMutationRoute(value: unknown): value is MutationRoute {
  return (
    isRecord(value) &&
    typeof value.POST === "function" &&
    typeof value.DELETE === "function"
  )
}

function mutationRouteOf(value: unknown): MutationRoute {
  if (!isMutationRoute(value)) {
    throw new Error("la route doit exporter POST et DELETE")
  }
  return value
}

function isListRoute(value: unknown): value is ListRoute {
  return isRecord(value) && typeof value.GET === "function"
}

function listRouteOf(value: unknown): ListRoute {
  if (!isListRoute(value)) {
    throw new Error("la liste des inscriptions doit exporter GET")
  }
  return value
}

function request(pathname: string, method: "DELETE" | "POST"): Request {
  const init: RequestInit = {
    headers: { origin: "http://localhost" },
    method,
  }
  if (method === "POST") {
    init.body = "{}"
    init.headers = {
      "content-type": "application/json",
      origin: "http://localhost",
    }
  }
  return new Request(`http://localhost${pathname}`, init)
}

async function loadActivityMutationRoute(
  activity: string,
): Promise<MutationRoute> {
  return activity === "jeu"
    ? mutationRouteOf(await import("@/app/api/jeux/[slug]/inscriptions/route"))
    : mutationRouteOf(
        await import("@/app/api/formations/[slug]/inscriptions/route"),
      )
}

afterEach(() => {
  vi.doUnmock("@/server/auth/require-user")
  vi.doUnmock("@/server/auth/request-security")
  vi.doUnmock("@/server/services/inscription-service")
  vi.restoreAllMocks()
  vi.resetModules()
})

describe("idempotence, annulation et Mes participations", () => {
  it(
    scenario(
      "Une seconde participation renvoie déjà inscrit sans erreur 500",
      "un membre déjà inscrit et un service qui renvoie ALREADY_REGISTERED",
      "POST est rejoué sur le même jeu",
      "la réponse vaut 200 avec un état cohérent et aucun détail de contrainte P2002",
    ),
    async () => {
      const user = {
        email: "member@example.test",
        id: "member",
        membership: "FREE",
      }
      vi.doMock("@/server/auth/require-user", () => ({
        requireUser: vi.fn().mockResolvedValue(user),
      }))
      vi.doMock("@/server/auth/request-security", () => ({
        enforceAuthMutationSecurity: vi.fn().mockResolvedValue(undefined),
      }))
      vi.doMock("@/server/services/inscription-service", () => ({
        participateInJeu: vi.fn().mockResolvedValue({
          emailConfirmation: false,
          location: "Abidjan",
          startsAt: "2026-12-12T10:00:00.000Z",
          status: "ALREADY_REGISTERED",
          title: "Challenge",
        }),
      }))
      const route = mutationRouteOf(
        await import("@/app/api/jeux/[slug]/inscriptions/route"),
      )

      const response = await route.POST(
        request("/api/jeux/challenge/inscriptions", "POST"),
        { params: Promise.resolve({ slug: "challenge" }) },
      )
      const raw = await response.text()

      expect(response.status).toBe(200)
      expect(JSON.parse(raw)).toMatchObject({ status: "ALREADY_REGISTERED" })
      expect(raw).not.toMatch(/P2002|Prisma|unique|stack/i)
    },
  )

  it.each([["jeu"], ["formation"]])(
    scenario(
      "Un membre peut annuler sa propre participation à un %s",
      "une participation existante et l'utilisateur propriétaire en session",
      "DELETE est envoyé sur la route de l'activité",
      "le service reçoit seulement slug et SessionUser, répond 204 et la place devient disponible",
    ),
    async (activity) => {
      const user = {
        email: "owner@example.test",
        id: "owner",
        membership: "FREE",
      }
      const cancelJeuParticipation = vi.fn().mockResolvedValue(undefined)
      const cancelFormationParticipation = vi.fn().mockResolvedValue(undefined)
      vi.doMock("@/server/auth/require-user", () => ({
        requireUser: vi.fn().mockResolvedValue(user),
      }))
      vi.doMock("@/server/auth/request-security", () => ({
        enforceAuthMutationSecurity: vi.fn().mockResolvedValue(undefined),
      }))
      vi.doMock("@/server/services/inscription-service", () => ({
        cancelFormationParticipation,
        cancelJeuParticipation,
      }))
      const route = await loadActivityMutationRoute(activity)
      const pathname =
        activity === "jeu"
          ? "/api/jeux/challenge/inscriptions"
          : "/api/formations/atelier/inscriptions"

      const response = await route.DELETE(request(pathname, "DELETE"), {
        params: Promise.resolve({
          slug: activity === "jeu" ? "challenge" : "atelier",
        }),
      })

      expect(response.status).toBe(204)
      const expected =
        activity === "jeu"
          ? cancelJeuParticipation
          : cancelFormationParticipation
      expect(expected).toHaveBeenCalledWith(
        activity === "jeu" ? "challenge" : "atelier",
        user,
      )
    },
  )

  it(
    scenario(
      "Une annulation ne peut désigner un autre utilisateur",
      "une session attaquante et une query userId pointant vers la victime",
      "DELETE parse la requête forgée",
      "la réponse vaut 400 et le service d'annulation n'est jamais appelé",
    ),
    async () => {
      const cancelJeuParticipation = vi.fn()
      vi.doMock("@/server/auth/require-user", () => ({
        requireUser: vi.fn().mockResolvedValue({
          email: "attacker@example.test",
          id: "attacker",
          membership: "FREE",
        }),
      }))
      vi.doMock("@/server/auth/request-security", () => ({
        enforceAuthMutationSecurity: vi.fn().mockResolvedValue(undefined),
      }))
      vi.doMock("@/server/services/inscription-service", () => ({
        cancelJeuParticipation,
      }))
      const route = mutationRouteOf(
        await import("@/app/api/jeux/[slug]/inscriptions/route"),
      )

      const response = await route.DELETE(
        request("/api/jeux/challenge/inscriptions?userId=victim", "DELETE"),
        { params: Promise.resolve({ slug: "challenge" }) },
      )
      const raw = await response.text()

      expect(response.status).toBe(400)
      expectGenericApiError(raw)
      expect(cancelJeuParticipation).not.toHaveBeenCalled()
    },
  )

  it(
    scenario(
      "Mes participations est paginé et filtré par la session",
      "un membre connecté et une query take 20 sans userId",
      "GET /api/inscriptions demande sa liste",
      "le service reçoit la pagination et la SessionUser, et le JSON ne contient aucun participant tiers",
    ),
    async () => {
      const user = {
        email: "member@example.test",
        id: "member",
        membership: "FREE",
      }
      const page = {
        items: [{ activityType: "JEU", slug: "challenge", title: "Challenge" }],
        nextCursor: null,
      }
      const getMyParticipations = vi.fn().mockResolvedValue(page)
      vi.doMock("@/server/auth/require-user", () => ({
        requireUser: vi.fn().mockResolvedValue(user),
      }))
      vi.doMock("@/server/services/inscription-service", () => ({
        getMyParticipations,
      }))
      const route = listRouteOf(await import("@/app/api/inscriptions/route"))

      const response = await route.GET(
        new Request(
          "http://localhost/api/inscriptions?cursor=participation-before&take=20",
        ),
      )
      const raw = await response.text()

      expect(response.status).toBe(200)
      expect(JSON.parse(raw)).toEqual(page)
      expect(getMyParticipations).toHaveBeenCalledWith(
        { cursor: "participation-before", take: 20 },
        user,
      )
      expect(raw).not.toMatch(/victim|passwordHash/i)
    },
  )

  it(
    scenario(
      "Une mutation d'origine étrangère est bloquée avant le service",
      "une session valide et une requête POST issue d'un domaine attaquant",
      "la protection CSRF rejette la mutation",
      "la réponse vaut 403 et aucune participation n'est créée",
    ),
    async () => {
      const participateInJeu = vi.fn()
      vi.doMock("@/server/auth/require-user", () => ({
        requireUser: vi.fn().mockResolvedValue({
          email: "member@example.test",
          id: "member",
          membership: "FREE",
        }),
      }))
      vi.doMock("@/server/auth/request-security", () => ({
        enforceAuthMutationSecurity: vi
          .fn()
          .mockRejectedValue(new UnauthorizedError()),
      }))
      vi.doMock("@/server/services/inscription-service", () => ({
        participateInJeu,
      }))
      const route = mutationRouteOf(
        await import("@/app/api/jeux/[slug]/inscriptions/route"),
      )
      const foreign = request("/api/jeux/challenge/inscriptions", "POST")
      foreign.headers.set("origin", "https://attacker.example")

      const response = await route.POST(foreign, {
        params: Promise.resolve({ slug: "challenge" }),
      })
      const raw = await response.text()

      expect(response.status).toBe(403)
      expectGenericApiError(raw)
      expect(participateInJeu).not.toHaveBeenCalled()
    },
  )
})
