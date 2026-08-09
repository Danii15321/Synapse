import { afterEach, describe, expect, it, vi } from "vitest"

import {
  ActivityFullError,
  NotEntitledError,
  RegistrationsClosedError,
  UnauthorizedError,
} from "@/server/errors"

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

function isMutationRoute(value: unknown): value is MutationRoute {
  return (
    isRecord(value) &&
    typeof value.POST === "function" &&
    typeof value.DELETE === "function"
  )
}

function mutationRouteOf(value: unknown): MutationRoute {
  if (!isMutationRoute(value)) {
    throw new Error("la route de participation doit exporter POST et DELETE")
  }
  return value
}

function mutationRequest(pathname: string, body: unknown = {}): Request {
  return new Request(`http://localhost${pathname}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "http://localhost" },
    method: "POST",
  })
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

describe("Route Handlers de participation", () => {
  it.each([["jeu"], ["formation événementielle"]])(
    scenario(
      "Une participation à un %s utilise la session et le régime sensible",
      "un membre authentifié et un body strictement vide",
      "POST sur la route de l'activité crée la participation",
      "la sécurité sensible reçoit le pathname, le service reçoit le slug et l'utilisateur, puis la réponse 201 confirme sans e-mail",
    ),
    async (activity) => {
      const user = {
        email: "member@example.test",
        id: "session-user",
        membership: "PREMIUM",
      }
      const confirmation = {
        emailConfirmation: false,
        location: activity === "jeu" ? "Abidjan" : "Hybride",
        startsAt: "2026-12-12T10:00:00.000Z",
        status: "CREATED",
        title: "Activité",
      }
      const participateInJeu = vi.fn().mockResolvedValue(confirmation)
      const participateInFormation = vi.fn().mockResolvedValue(confirmation)
      const requireUser = vi.fn().mockResolvedValue(user)
      const enforceAuthMutationSecurity = vi.fn().mockResolvedValue(undefined)
      vi.doMock("@/server/auth/require-user", () => ({ requireUser }))
      vi.doMock("@/server/auth/request-security", () => ({
        enforceAuthMutationSecurity,
      }))
      vi.doMock("@/server/services/inscription-service", () => ({
        participateInFormation,
        participateInJeu,
      }))
      const route = await loadActivityMutationRoute(activity)
      const pathname =
        activity === "jeu"
          ? "/api/jeux/challenge/inscriptions"
          : "/api/formations/atelier/inscriptions"
      const slug = activity === "jeu" ? "challenge" : "atelier"

      const response = await route.POST(mutationRequest(pathname), {
        params: Promise.resolve({ slug }),
      })

      expect(response.status).toBe(201)
      expect(await response.json()).toEqual(confirmation)
      expect(enforceAuthMutationSecurity).toHaveBeenCalledWith(
        expect.any(Request),
        pathname,
      )
      const expectedService =
        activity === "jeu" ? participateInJeu : participateInFormation
      expect(expectedService).toHaveBeenCalledWith(slug, user)
    },
  )

  it(
    scenario(
      "Un appel direct sans session est refusé",
      "une requête POST forgée vers un jeu sans cookie de session",
      "le Route Handler est appelé sans passer par l'interface",
      "la réponse brute vaut 401 avec erreur générique et le service n'est jamais appelé",
    ),
    async () => {
      const participateInJeu = vi.fn()
      vi.doMock("@/server/auth/require-user", () => ({
        requireUser: vi.fn().mockRejectedValue(new UnauthorizedError()),
      }))
      vi.doMock("@/server/auth/request-security", () => ({
        enforceAuthMutationSecurity: vi.fn().mockResolvedValue(undefined),
      }))
      vi.doMock("@/server/services/inscription-service", () => ({
        participateInJeu,
      }))
      const route = mutationRouteOf(
        await import("@/app/api/jeux/[slug]/inscriptions/route"),
      )

      const response = await route.POST(
        mutationRequest("/api/jeux/challenge/inscriptions"),
        { params: Promise.resolve({ slug: "challenge" }) },
      )
      const raw = await response.text()

      expect(response.status).toBe(401)
      expectGenericApiError(raw)
      expect(participateInJeu).not.toHaveBeenCalled()
    },
  )

  it(
    scenario(
      "Le body ne peut forger ni utilisateur ni données complémentaires",
      "une session victime valide et un body contenant userId, téléphone et motivation contrôlés par le client",
      "POST valide l'entrée avec Zod strict",
      "la réponse vaut 400 et aucune valeur forgée n'atteint le service",
    ),
    async () => {
      const participateInJeu = vi.fn()
      vi.doMock("@/server/auth/require-user", () => ({
        requireUser: vi.fn().mockResolvedValue({
          email: "victime@example.test",
          id: "victime",
          membership: "FREE",
        }),
      }))
      vi.doMock("@/server/auth/request-security", () => ({
        enforceAuthMutationSecurity: vi.fn().mockResolvedValue(undefined),
      }))
      vi.doMock("@/server/services/inscription-service", () => ({
        participateInJeu,
      }))
      const route = mutationRouteOf(
        await import("@/app/api/jeux/[slug]/inscriptions/route"),
      )

      const response = await route.POST(
        mutationRequest("/api/jeux/challenge/inscriptions", {
          motivation: "forgée",
          telephone: "+2250000000000",
          userId: "attaquant",
        }),
        { params: Promise.resolve({ slug: "challenge" }) },
      )
      const raw = await response.text()

      expect(response.status).toBe(400)
      expectGenericApiError(raw)
      expect(participateInJeu).not.toHaveBeenCalled()
    },
  )

  const refusalCases: ReadonlyArray<readonly [string, number, () => Error]> = [
    ["NotEntitledError", 403, () => new NotEntitledError("jeu", "PREMIUM")],
    ["RegistrationsClosedError", 409, () => new RegistrationsClosedError()],
    ["ActivityFullError", 409, () => new ActivityFullError()],
  ]

  it.each(refusalCases)(
    scenario(
      "Les refus métier %s deviennent un HTTP %s clair sans fuite",
      "une session valide et un service qui lève l'erreur domaine attendue",
      "POST traite le refus",
      "le statut est stable, le JSON reste générique et aucune erreur Prisma ou stack n'est exposée",
    ),
    async (_name, expectedStatus, createError) => {
      const error = createError()
      vi.doMock("@/server/auth/require-user", () => ({
        requireUser: vi.fn().mockResolvedValue({
          email: "member@example.test",
          id: "member",
          membership: "FREE",
        }),
      }))
      vi.doMock("@/server/auth/request-security", () => ({
        enforceAuthMutationSecurity: vi.fn().mockResolvedValue(undefined),
      }))
      vi.doMock("@/server/services/inscription-service", () => ({
        participateInJeu: vi.fn().mockRejectedValue(error),
      }))
      const route = mutationRouteOf(
        await import("@/app/api/jeux/[slug]/inscriptions/route"),
      )

      const response = await route.POST(
        mutationRequest("/api/jeux/challenge/inscriptions"),
        { params: Promise.resolve({ slug: "challenge" }) },
      )
      const raw = await response.text()

      expect(response.status).toBe(expectedStatus)
      expectGenericApiError(raw)
      expect(raw).not.toContain(error.message)
    },
  )
})
