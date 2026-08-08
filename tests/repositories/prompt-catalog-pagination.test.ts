import { afterEach, describe, expect, it, vi } from "vitest"

import { db } from "@/server/db"

import {
  cleanupPromptFixtures,
  insertLargeDataset,
  insertPrompt,
  loadRepository,
  newPrefix,
  rowsOf,
  scenario,
} from "./prompt-catalog-fixtures"

afterEach(cleanupPromptFixtures)

describe("pagination et coût SQL du catalogue Prompt", () => {
  it(
    scenario(
      "Le curseur parcourt au moins 200 prompts sans doublon ni saut lorsqu'un contenu est ajouté",
      "205 prompts publiés portant un tag isolé et ordonnables de façon stable",
      "des pages de 40 sont lues par curseur et un nouveau prompt est publié après la première page",
      "les 205 identifiants initiaux sont vus exactement une fois, aucun offset n'est nécessaire et aucune page ne dépasse take",
    ),
    async () => {
      const prefix = newPrefix("cursor")
      await insertLargeDataset(prefix)
      const repository = await loadRepository()
      const seen: string[] = []
      let cursor: string | undefined

      for (let pageIndex = 0; pageIndex < 10; pageIndex += 1) {
        const page = rowsOf(
          await repository.findMany({ cursor, tag: prefix, take: 40 }),
        )
        expect(page.length).toBeLessThanOrEqual(40)
        if (pageIndex === 0) {
          await insertPrompt(`${prefix}-ajout`, { tags: [prefix] })
        }
        if (page.length === 0) break
        const ids = page.map((row) => String(row.id))
        seen.push(...ids)
        cursor = ids.at(-1)
        if (page.length < 40) break
      }

      const initialIds = Array.from(
        { length: 205 },
        (_, index) => `${prefix}-id-${String(index + 1).padStart(3, "0")}`,
      )
      expect(new Set(seen).size).toBe(seen.length)
      for (const id of initialIds) {
        expect(seen.filter((candidate) => candidate === id)).toHaveLength(1)
      }
    },
    30_000,
  )

  it(
    scenario(
      "La liste volumineuse exécute une seule requête Prisma et aucune requête par carte",
      "205 prompts publiés et un client Prisma instrumenté au niveau des opérations",
      "findMany charge une page de 100 éléments",
      "le journal instrumenté contient exactement une opération findMany sur Prompt, indépendamment du nombre de rows",
    ),
    async () => {
      const prefix = newPrefix("queries")
      await insertLargeDataset(prefix)
      const operations: Array<{
        model: string | undefined
        operation: string
      }> = []
      const instrumentedDb = db.$extends({
        query: {
          $allModels: {
            async $allOperations({ args, model, operation, query }) {
              operations.push({ model, operation })
              return query(args)
            },
          },
        },
      })
      vi.doMock("@/server/db", () => ({ db: instrumentedDb }))
      vi.resetModules()
      const repository = await loadRepository()

      const rows = rowsOf(await repository.findMany({ tag: prefix, take: 100 }))

      expect(rows).toHaveLength(100)
      expect(
        operations.filter(
          ({ model, operation }) =>
            model === "Prompt" && operation === "findMany",
        ),
      ).toHaveLength(1)
      expect(operations).toHaveLength(1)
    },
    30_000,
  )
})
