import { afterEach, describe, expect, it } from "vitest"

import {
  cleanupJeuxInscriptions,
  insertLargeJeuInscriptions,
  insertLargeJeux,
  insertUser,
  isRecord,
  newPrefix,
  scenario,
} from "./jeux-inscriptions-fixtures"

type JeuListRepository = Readonly<{
  findMany: (options: Readonly<Record<string, unknown>>) => Promise<unknown>
}>

type InscriptionListRepository = Readonly<{
  findManyByUserId: (input: {
    cursor?: string
    take: number
    userId: string
  }) => Promise<unknown>
}>

function isJeuListRepository(value: unknown): value is JeuListRepository {
  return isRecord(value) && typeof value.findMany === "function"
}

function isInscriptionListRepository(
  value: unknown,
): value is InscriptionListRepository {
  return isRecord(value) && typeof value.findManyByUserId === "function"
}

async function loadJeuRepository(): Promise<JeuListRepository> {
  const module: unknown = await import("@/server/repositories/jeu-repository")
  if (!isJeuListRepository(module)) {
    throw new Error("jeu-repository doit exposer findMany")
  }
  return module
}

async function loadInscriptionRepository(): Promise<InscriptionListRepository> {
  const module: unknown =
    await import("@/server/repositories/inscription-repository")
  if (!isInscriptionListRepository(module)) {
    throw new Error("inscription-repository doit exposer findManyByUserId")
  }
  return module
}

function rowsOf(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error("la liste Jeux du repository doit retourner des rows")
  }
  return value
}

function participationPageOf(value: unknown): Readonly<{
  items: Array<Record<string, unknown>>
  nextCursor: string | null
}> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    !value.items.every(isRecord) ||
    !(typeof value.nextCursor === "string" || value.nextCursor === null)
  ) {
    throw new Error("Mes participations doit retourner une page avec curseur")
  }
  return { items: value.items, nextCursor: value.nextCursor }
}

afterEach(cleanupJeuxInscriptions)

describe("pagination bornée des Jeux et de Mes participations", () => {
  it(
    scenario(
      "Le curseur Jeux parcourt plus de 200 cartes sans doublon ni page non bornée",
      "205 jeux publiés et ordonnés de manière stable",
      "des pages de 40 sont lues en transmettant le dernier id comme curseur",
      "les 205 jeux sont vus une seule fois et aucune requête ne retourne plus que take",
    ),
    async () => {
      const prefix = newPrefix("jeu-cursor")
      await insertLargeJeux(prefix)
      const repository = await loadJeuRepository()
      const seen: string[] = []
      let cursor: string | undefined

      for (let pageIndex = 0; pageIndex < 10; pageIndex += 1) {
        const rows = rowsOf(await repository.findMany({ cursor, take: 40 }))
        expect(rows.length).toBeLessThanOrEqual(40)
        const ids = rows
          .map(({ id }) => String(id))
          .filter((id) => id.startsWith(prefix))
        seen.push(...ids)
        if (rows.length === 0) break
        cursor = String(rows.at(-1)?.id)
        if (rows.length < 40) break
      }

      expect(new Set(seen).size).toBe(205)
      expect(seen).toHaveLength(205)
    },
    30_000,
  )

  it(
    scenario(
      "Mes participations respecte take et son nextCursor sur plus de 200 lignes",
      "un membre avec 205 participations à des jeux publiés",
      "le repository lit des pages de 40 en réutilisant nextCursor",
      "chaque page contient au plus 40 activités et les 205 inscriptions apparaissent une seule fois",
    ),
    async () => {
      const prefix = newPrefix("participation-cursor")
      const userId = await insertUser(prefix)
      await insertLargeJeux(prefix)
      await insertLargeJeuInscriptions(prefix, userId)
      const repository = await loadInscriptionRepository()
      const seen: string[] = []
      let cursor: string | undefined

      for (let pageIndex = 0; pageIndex < 10; pageIndex += 1) {
        const page = participationPageOf(
          await repository.findManyByUserId({ cursor, take: 40, userId }),
        )
        expect(page.items.length).toBeLessThanOrEqual(40)
        const slugs = page.items.map(({ slug }) => String(slug))
        seen.push(...slugs)
        cursor = page.nextCursor ?? undefined
        if (!cursor) break
      }

      expect(new Set(seen).size).toBe(205)
      expect(seen).toHaveLength(205)
    },
    30_000,
  )
})
