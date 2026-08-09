import { afterEach, describe, expect, it } from "vitest"

import {
  cleanupJeuxInscriptions,
  insertFormation,
  insertJeu,
  insertUser,
  inscriptionCountForJeu,
  isRecord,
  newPrefix,
  scenario,
} from "./jeux-inscriptions-fixtures"

type ReservationResult = Readonly<{
  status: "ALREADY_REGISTERED" | "CREATED" | "FULL"
}>

type InscriptionRepository = Readonly<{
  cancelFormationParticipation: (input: {
    formationId: string
    userId: string
  }) => Promise<boolean>
  cancelJeuParticipation: (input: {
    jeuId: string
    userId: string
  }) => Promise<boolean>
  findManyByUserId: (input: {
    take: number
    userId: string
  }) => Promise<unknown>
  reserveFormationParticipation: (input: {
    formationId: string
    userId: string
  }) => Promise<ReservationResult>
  reserveJeuPlace: (input: {
    capacity: number | null
    jeuId: string
    userId: string
  }) => Promise<ReservationResult>
}>

function isInscriptionRepository(
  value: unknown,
): value is InscriptionRepository {
  return (
    isRecord(value) &&
    typeof value.cancelFormationParticipation === "function" &&
    typeof value.cancelJeuParticipation === "function" &&
    typeof value.findManyByUserId === "function" &&
    typeof value.reserveFormationParticipation === "function" &&
    typeof value.reserveJeuPlace === "function"
  )
}

async function loadRepository(): Promise<InscriptionRepository> {
  const module: unknown =
    await import("@/server/repositories/inscription-repository")
  if (!isInscriptionRepository(module)) {
    throw new Error("inscription-repository doit exposer le contrat persistant")
  }
  return module
}

function itemsOf(value: unknown): Array<Record<string, unknown>> {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new Error("la liste des participations doit être paginée")
  }
  if (!value.items.every(isRecord)) {
    throw new Error("chaque participation doit être un objet")
  }
  return value.items
}

afterEach(cleanupJeuxInscriptions)

describe("repository des participations sur PostgreSQL", () => {
  it(
    scenario(
      "Une double soumission produit une seule inscription et un état idempotent",
      "un membre, un jeu publié sans limite et aucune inscription",
      "deux réservations concurrentes du même membre sont envoyées au repository",
      "un appel crée, l'autre renvoie ALREADY_REGISTERED sans exception et une seule ligne existe en base",
    ),
    async () => {
      const prefix = newPrefix("double")
      const userId = await insertUser(prefix)
      const jeuId = await insertJeu(prefix)
      const repository = await loadRepository()

      const outcomes = await Promise.all([
        repository.reserveJeuPlace({ capacity: null, jeuId, userId }),
        repository.reserveJeuPlace({ capacity: null, jeuId, userId }),
      ])

      expect(outcomes.map(({ status }) => status).sort()).toEqual([
        "ALREADY_REGISTERED",
        "CREATED",
      ])
      expect(await inscriptionCountForJeu(jeuId)).toBe(1)
    },
  )

  it(
    scenario(
      "Deux membres concurrents ne reçoivent pas tous deux la dernière place",
      "un jeu de capacité un et deux membres sans participation",
      "les deux transactions comptent et insèrent simultanément",
      "une seule réservation vaut CREATED, l'autre vaut FULL et la base contient exactement une inscription",
    ),
    async () => {
      const jeuPrefix = newPrefix("last-place")
      const firstPrefix = newPrefix("last-place-a")
      const secondPrefix = newPrefix("last-place-b")
      const jeuId = await insertJeu(jeuPrefix, { capacity: 1 })
      const firstUserId = await insertUser(firstPrefix)
      const secondUserId = await insertUser(secondPrefix)
      const repository = await loadRepository()

      const outcomes = await Promise.all([
        repository.reserveJeuPlace({
          capacity: 1,
          jeuId,
          userId: firstUserId,
        }),
        repository.reserveJeuPlace({
          capacity: 1,
          jeuId,
          userId: secondUserId,
        }),
      ])

      expect(outcomes.map(({ status }) => status).sort()).toEqual([
        "CREATED",
        "FULL",
      ])
      expect(await inscriptionCountForJeu(jeuId)).toBe(1)
    },
  )

  it(
    scenario(
      "Une formation événementielle rejoint le même parcours idempotent",
      "un membre et une formation événementielle future sans participation",
      "le repository réserve deux fois la formation puis liste les participations du membre",
      "la première réservation crée, la seconde est idempotente et la liste contient une seule formation",
    ),
    async () => {
      const prefix = newPrefix("formation-event")
      const userId = await insertUser(prefix)
      const formationId = await insertFormation(prefix, "EVENEMENTIELLE")
      const repository = await loadRepository()

      const first = await repository.reserveFormationParticipation({
        formationId,
        userId,
      })
      const second = await repository.reserveFormationParticipation({
        formationId,
        userId,
      })
      const items = itemsOf(
        await repository.findManyByUserId({ take: 20, userId }),
      )

      expect(first.status).toBe("CREATED")
      expect(second.status).toBe("ALREADY_REGISTERED")
      expect(items).toHaveLength(1)
      expect(JSON.stringify(items[0])).toContain(formationId)
    },
  )

  it(
    scenario(
      "La lecture et l'annulation restent isolées par le userId de session",
      "deux membres participent au même jeu",
      "le premier liste ses participations puis tente une annulation avec son userId avant d'annuler la sienne",
      "sa liste n'expose aucune donnée du second, l'annulation ne supprime que sa ligne et libère exactement une place",
    ),
    async () => {
      const jeuPrefix = newPrefix("isolation-jeu")
      const firstPrefix = newPrefix("isolation-a")
      const secondPrefix = newPrefix("isolation-b")
      const jeuId = await insertJeu(jeuPrefix)
      const firstUserId = await insertUser(firstPrefix)
      const secondUserId = await insertUser(secondPrefix)
      const repository = await loadRepository()
      await repository.reserveJeuPlace({
        capacity: null,
        jeuId,
        userId: firstUserId,
      })
      await repository.reserveJeuPlace({
        capacity: null,
        jeuId,
        userId: secondUserId,
      })

      const firstItems = itemsOf(
        await repository.findManyByUserId({ take: 20, userId: firstUserId }),
      )
      const cancelled = await repository.cancelJeuParticipation({
        jeuId,
        userId: firstUserId,
      })
      const cancelledAgain = await repository.cancelJeuParticipation({
        jeuId,
        userId: firstUserId,
      })

      expect(firstItems).toHaveLength(1)
      expect(JSON.stringify(firstItems)).not.toContain(secondUserId)
      expect(cancelled).toBe(true)
      expect(cancelledAgain).toBe(false)
      expect(await inscriptionCountForJeu(jeuId)).toBe(1)
      const secondItems = itemsOf(
        await repository.findManyByUserId({ take: 20, userId: secondUserId }),
      )
      expect(secondItems).toHaveLength(1)
    },
  )
})
