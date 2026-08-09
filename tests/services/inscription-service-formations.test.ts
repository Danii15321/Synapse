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

function eventFormation(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    format: "HYBRIDE",
    id: "formation-event",
    kind: "EVENEMENTIELLE",
    publishedAt: new Date("2026-08-09T00:00:00.000Z"),
    startsAt: new Date("2026-12-12T10:00:00.000Z"),
    title: "Atelier pitch",
    visibility: "FREE",
    ...overrides,
  }
}

describe("participations aux formations et espace membre", () => {
  it(
    scenario(
      "Une formation événementielle future accepte une participation sans formulaire complémentaire",
      "une formation événementielle FREE publiée et un membre connecté dont le compte contient nom et e-mail",
      "le membre clique Je participe sans transmettre téléphone, établissement ni motivation",
      "la réservation utilise seulement formationId et userId puis confirme date, modalité et absence d'e-mail",
    ),
    async () => {
      const reserveFormationParticipation = vi
        .fn()
        .mockResolvedValue({ status: "CREATED" })
      vi.doMock("@/server/repositories/formation-repository", () => ({
        findParticipationMetaBySlug: vi
          .fn()
          .mockResolvedValue(eventFormation()),
      }))
      vi.doMock("@/server/repositories/inscription-repository", () => ({
        reserveFormationParticipation,
      }))
      vi.doMock("@/server/access/entitlement", () => ({
        canAccess: vi.fn().mockReturnValue(true),
      }))
      const service = await loadInscriptionService()

      const result = await service.participateInFormation(
        "atelier-pitch",
        FREE_USER,
      )

      expect(reserveFormationParticipation).toHaveBeenCalledWith({
        formationId: "formation-event",
        userId: FREE_USER.id,
      })
      expect(result).toEqual({
        activityType: "FORMATION",
        emailConfirmation: false,
        location: "Hybride",
        startsAt: "2026-12-12T10:00:00.000Z",
        status: "CREATED",
        title: "Atelier pitch",
      })
      expect(JSON.stringify(result)).not.toMatch(
        /téléphone|telephone|établissement|motivation/i,
      )
    },
  )

  it(
    scenario(
      "Une formation permanente n'accepte jamais de participation",
      "une formation PERMANENTE FREE publiée et consultable à tout moment",
      "un membre connecté tente d'appeler directement le service de participation",
      "ParticipationNotAllowedError est levée avant toute écriture",
    ),
    async () => {
      const reserveFormationParticipation = vi.fn()
      vi.doMock("@/server/repositories/formation-repository", () => ({
        findParticipationMetaBySlug: vi.fn().mockResolvedValue(
          eventFormation({
            kind: "PERMANENTE",
            startsAt: null,
          }),
        ),
      }))
      vi.doMock("@/server/repositories/inscription-repository", () => ({
        reserveFormationParticipation,
      }))
      vi.doMock("@/server/access/entitlement", () => ({
        canAccess: vi.fn().mockReturnValue(true),
      }))
      const service = await loadInscriptionService()

      await expect(
        service.participateInFormation("formation-permanente", FREE_USER),
      ).rejects.toMatchObject({ name: "ParticipationNotAllowedError" })
      expect(reserveFormationParticipation).not.toHaveBeenCalled()
    },
  )

  it(
    scenario(
      "L'accès premium reste indépendant du type événementiel",
      "une formation EVENEMENTIELLE PREMIUM et un membre FREE",
      "le membre tente de participer à l'événement",
      "canAccess refuse et aucune réservation n'est créée malgré le bon type de formation",
    ),
    async () => {
      const reserveFormationParticipation = vi.fn()
      const canAccess = vi.fn().mockReturnValue(false)
      vi.doMock("@/server/repositories/formation-repository", () => ({
        findParticipationMetaBySlug: vi
          .fn()
          .mockResolvedValue(eventFormation({ visibility: "PREMIUM" })),
      }))
      vi.doMock("@/server/repositories/inscription-repository", () => ({
        reserveFormationParticipation,
      }))
      vi.doMock("@/server/access/entitlement", () => ({ canAccess }))
      const service = await loadInscriptionService()

      await expect(
        service.participateInFormation("atelier-premium", FREE_USER),
      ).rejects.toMatchObject({ name: "NotEntitledError" })
      expect(canAccess).toHaveBeenCalledWith(FREE_USER, {
        visibility: "PREMIUM",
      })
      expect(reserveFormationParticipation).not.toHaveBeenCalled()
    },
  )

  it(
    scenario(
      "Une formation événementielle passée refuse une nouvelle participation",
      "une formation événementielle dont startsAt est dépassée",
      "un membre PREMIUM appelle le service",
      "RegistrationsClosedError est levée et aucune ligne n'est créée",
    ),
    async () => {
      const reserveFormationParticipation = vi.fn()
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-12-13T10:00:00.000Z"))
      vi.doMock("@/server/repositories/formation-repository", () => ({
        findParticipationMetaBySlug: vi
          .fn()
          .mockResolvedValue(eventFormation()),
      }))
      vi.doMock("@/server/repositories/inscription-repository", () => ({
        reserveFormationParticipation,
      }))
      vi.doMock("@/server/access/entitlement", () => ({
        canAccess: vi.fn().mockReturnValue(true),
      }))
      const service = await loadInscriptionService()

      await expect(
        service.participateInFormation("atelier-passe", PREMIUM_USER),
      ).rejects.toMatchObject({ name: "RegistrationsClosedError" })
      expect(reserveFormationParticipation).not.toHaveBeenCalled()
    },
  )

  it(
    scenario(
      "Mes participations et l'annulation utilisent exclusivement l'identité de session",
      "un membre connecté et des repositories isolés par userId",
      "le service liste puis annule une participation Jeu et une participation Formation",
      "chaque appel reçoit l'id de session, l'annulation libère la place sans identifiant utilisateur fourni par le client",
    ),
    async () => {
      const findManyByUserId = vi.fn().mockResolvedValue({
        items: [],
        nextCursor: null,
      })
      const cancelJeuParticipation = vi.fn().mockResolvedValue(true)
      const cancelFormationParticipation = vi.fn().mockResolvedValue(true)
      vi.doMock("@/server/repositories/jeu-repository", () => ({
        findParticipationMetaBySlug: vi.fn().mockResolvedValue({ id: "jeu-1" }),
      }))
      vi.doMock("@/server/repositories/formation-repository", () => ({
        findParticipationMetaBySlug: vi
          .fn()
          .mockResolvedValue({ id: "formation-1", kind: "EVENEMENTIELLE" }),
      }))
      vi.doMock("@/server/repositories/inscription-repository", () => ({
        cancelFormationParticipation,
        cancelJeuParticipation,
        findManyByUserId,
      }))
      const service = await loadInscriptionService()

      await service.getMyParticipations(
        { cursor: "participation-before", take: 20 },
        FREE_USER,
      )
      await service.cancelJeuParticipation("jeu-1", FREE_USER)
      await service.cancelFormationParticipation("formation-1", FREE_USER)

      expect(findManyByUserId).toHaveBeenCalledWith({
        cursor: "participation-before",
        take: 20,
        userId: FREE_USER.id,
      })
      expect(cancelJeuParticipation).toHaveBeenCalledWith({
        jeuId: "jeu-1",
        userId: FREE_USER.id,
      })
      expect(cancelFormationParticipation).toHaveBeenCalledWith({
        formationId: "formation-1",
        userId: FREE_USER.id,
      })
    },
  )
})
