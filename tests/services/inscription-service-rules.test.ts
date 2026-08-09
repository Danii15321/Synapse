import { afterEach, describe, expect, it, vi } from "vitest"

import {
  FREE_USER,
  PREMIUM_USER,
  loadInscriptionService,
  resetInscriptionMocks,
  scenario,
} from "./inscription-service-fixtures"

afterEach(() => {
  vi.useRealTimers()
  resetInscriptionMocks()
})

function openJeu(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    capacity: 20,
    closesAt: new Date("2026-12-11T23:59:59.000Z"),
    id: "jeu-1",
    location: "Abidjan, Cocody",
    publishedAt: new Date("2026-08-09T00:00:00.000Z"),
    startsAt: new Date("2026-12-12T10:00:00.000Z"),
    title: "Challenge entrepreneurial",
    visibility: "FREE",
    ...overrides,
  }
}

describe("règles du service de participation aux jeux", () => {
  it(
    scenario(
      "Un appel sans session est refusé avant toute écriture",
      "un jeu publié et une requête directe sans utilisateur authentifié",
      "le service reçoit null au lieu d'une SessionUser",
      "il lève UnauthorizedError et le repository d'inscription n'est jamais appelé",
    ),
    async () => {
      const reserveJeuPlace = vi.fn()
      vi.doMock("@/server/repositories/jeu-repository", () => ({
        findParticipationMetaBySlug: vi.fn().mockResolvedValue(openJeu()),
      }))
      vi.doMock("@/server/repositories/inscription-repository", () => ({
        reserveJeuPlace,
      }))
      const service = await loadInscriptionService()

      await expect(
        service.participateInJeu("jeu-1", null),
      ).rejects.toMatchObject({ name: "UnauthorizedError" })
      expect(reserveJeuPlace).not.toHaveBeenCalled()
    },
  )

  it(
    scenario(
      "Un membre FREE ne participe pas à un concours PREMIUM",
      "un concours PREMIUM publié, ouvert et non complet",
      "le membre FREE demande à participer",
      "canAccess reçoit l'identité et la visibilité, puis NotEntitledError bloque toute réservation",
    ),
    async () => {
      const meta = openJeu({ visibility: "PREMIUM" })
      const reserveJeuPlace = vi.fn()
      const canAccess = vi.fn().mockReturnValue(false)
      vi.doMock("@/server/repositories/jeu-repository", () => ({
        findParticipationMetaBySlug: vi.fn().mockResolvedValue(meta),
      }))
      vi.doMock("@/server/repositories/inscription-repository", () => ({
        reserveJeuPlace,
      }))
      vi.doMock("@/server/access/entitlement", () => ({ canAccess }))
      const service = await loadInscriptionService()

      await expect(
        service.participateInJeu("jeu-1", FREE_USER),
      ).rejects.toMatchObject({ name: "NotEntitledError" })
      expect(canAccess).toHaveBeenCalledWith(FREE_USER, {
        visibility: "PREMIUM",
      })
      expect(reserveJeuPlace).not.toHaveBeenCalled()
    },
  )

  it.each([
    ["non publié", { publishedAt: null }],
    ["clos", { closesAt: new Date("2026-08-08T23:59:59.000Z") }],
  ])(
    scenario(
      "Un jeu %s refuse la participation",
      "un jeu %s et un membre PREMIUM connecté",
      "le service évalue publication et closesAt à l'instant courant",
      "RegistrationsClosedError est levée et aucune place n'est réservée",
    ),
    async (_label, override) => {
      const reserveJeuPlace = vi.fn()
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-08-09T12:00:00.000Z"))
      vi.doMock("@/server/repositories/jeu-repository", () => ({
        findParticipationMetaBySlug: vi
          .fn()
          .mockResolvedValue(openJeu(override)),
      }))
      vi.doMock("@/server/repositories/inscription-repository", () => ({
        reserveJeuPlace,
      }))
      vi.doMock("@/server/access/entitlement", () => ({
        canAccess: vi.fn().mockReturnValue(true),
      }))
      const service = await loadInscriptionService()

      await expect(
        service.participateInJeu("jeu-1", PREMIUM_USER),
      ).rejects.toMatchObject({ name: "RegistrationsClosedError" })
      expect(reserveJeuPlace).not.toHaveBeenCalled()
    },
  )

  it(
    scenario(
      "La violation d'unicité devient un succès déjà inscrit et non une erreur 500",
      "un jeu ouvert et un repository qui signale ALREADY_REGISTERED après arbitrage PostgreSQL",
      "le même membre participe une seconde fois",
      "le service renvoie déjà inscrit avec date, lieu et absence d'e-mail sans propager d'erreur technique",
    ),
    async () => {
      const meta = openJeu()
      const reserveJeuPlace = vi
        .fn()
        .mockResolvedValue({ status: "ALREADY_REGISTERED" })
      vi.doMock("@/server/repositories/jeu-repository", () => ({
        findParticipationMetaBySlug: vi.fn().mockResolvedValue(meta),
      }))
      vi.doMock("@/server/repositories/inscription-repository", () => ({
        reserveJeuPlace,
      }))
      vi.doMock("@/server/access/entitlement", () => ({
        canAccess: vi.fn().mockReturnValue(true),
      }))
      const service = await loadInscriptionService()

      const result = await service.participateInJeu("jeu-1", PREMIUM_USER)

      expect(result).toEqual({
        activityType: "JEU",
        emailConfirmation: false,
        location: "Abidjan, Cocody",
        startsAt: "2026-12-12T10:00:00.000Z",
        status: "ALREADY_REGISTERED",
        title: "Challenge entrepreneurial",
      })
      expect(reserveJeuPlace).toHaveBeenCalledWith({
        capacity: 20,
        jeuId: "jeu-1",
        userId: PREMIUM_USER.id,
      })
    },
  )

  it(
    scenario(
      "Un jeu complet produit un refus métier clair",
      "un jeu ouvert dont la transaction atomique renvoie FULL",
      "le membre connecté tente de prendre une place",
      "ActivityFullError est levée sans exposer Prisma ni transformer FULL en confirmation",
    ),
    async () => {
      vi.doMock("@/server/repositories/jeu-repository", () => ({
        findParticipationMetaBySlug: vi.fn().mockResolvedValue(openJeu()),
      }))
      vi.doMock("@/server/repositories/inscription-repository", () => ({
        reserveJeuPlace: vi.fn().mockResolvedValue({ status: "FULL" }),
      }))
      vi.doMock("@/server/access/entitlement", () => ({
        canAccess: vi.fn().mockReturnValue(true),
      }))
      const service = await loadInscriptionService()

      await expect(
        service.participateInJeu("jeu-1", PREMIUM_USER),
      ).rejects.toMatchObject({ name: "ActivityFullError" })
    },
  )
})
