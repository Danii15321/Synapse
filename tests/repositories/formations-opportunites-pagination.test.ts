import { afterEach, describe, expect, it, vi } from "vitest"

import { db } from "@/server/db"

import {
  cleanupReplicatedContent,
  insertLargeFormations,
  insertLargeOpportunites,
  newPrefix,
  rowsOf,
  scenario,
} from "./replicated-content-fixtures"

type ListRepository = Readonly<{
  findMany: (options: Readonly<Record<string, unknown>>) => Promise<unknown>
}>

function isListRepository(value: unknown): value is ListRepository {
  return (
    typeof value === "object" &&
    value !== null &&
    "findMany" in value &&
    typeof value.findMany === "function"
  )
}

async function formationRepository(): Promise<ListRepository> {
  const module: unknown =
    await import("@/server/repositories/formation-repository")
  if (!isListRepository(module)) throw new Error("findMany Formation requis")
  return module
}

async function opportuniteRepository(): Promise<ListRepository> {
  const module: unknown =
    await import("@/server/repositories/opportunite-repository")
  if (!isListRepository(module)) throw new Error("findMany Opportunite requis")
  return module
}

afterEach(async () => {
  vi.doUnmock("@/server/db")
  vi.resetModules()
  await cleanupReplicatedContent()
})

async function expectCursorTraversal(
  repository: ListRepository,
  prefix: string,
): Promise<void> {
  const seen: string[] = []
  let cursor: string | undefined
  for (let pageIndex = 0; pageIndex < 10; pageIndex += 1) {
    const page = rowsOf(await repository.findMany({ cursor, take: 40 }))
    expect(page.length).toBeLessThanOrEqual(40)
    const ids = page
      .map(({ id }) => String(id))
      .filter((id) => id.startsWith(prefix))
    seen.push(...ids)
    if (page.length === 0) break
    cursor = String(page.at(-1)?.id)
    if (page.length < 40) break
  }
  const expected = Array.from(
    { length: 205 },
    (_, index) => `${prefix}-id-${String(index + 1).padStart(3, "0")}`,
  )
  expect(new Set(seen).size).toBe(seen.length)
  for (const id of expected) expect(seen).toContain(id)
}

describe("pagination bornée sans N+1 des rubriques répliquées", () => {
  it(
    scenario(
      "Le curseur Formation parcourt plus de 200 contenus sans doublon ni saut",
      "205 formations permanentes publiées",
      "des pages de 40 sont lues avec le curseur retourné",
      "les 205 identifiants initiaux sont vus exactement une fois et aucune page ne dépasse take",
    ),
    async () => {
      const prefix = newPrefix("formation-cursor")
      await insertLargeFormations(prefix)
      await expectCursorTraversal(await formationRepository(), prefix)
    },
    30_000,
  )

  it(
    scenario(
      "Le curseur Opportunité parcourt plus de 200 contenus sans doublon ni saut",
      "205 opportunités futures publiées",
      "des pages de 40 sont lues avec le curseur retourné",
      "les 205 identifiants initiaux sont vus exactement une fois et aucune page ne dépasse take",
    ),
    async () => {
      const prefix = newPrefix("opportunite-cursor")
      await insertLargeOpportunites(prefix)
      await expectCursorTraversal(await opportuniteRepository(), prefix)
    },
    30_000,
  )

  it.each([
    ["Formation", insertLargeFormations, formationRepository],
    ["Opportunite", insertLargeOpportunites, opportuniteRepository],
  ])(
    scenario(
      "Une page volumineuse %s exécute une seule requête et aucun N+1",
      "205 rows et un client Prisma instrumenté",
      "findMany charge 100 cartes",
      "exactement une opération findMany du modèle ciblé est observée",
    ),
    async (model, insertMany, load) => {
      const prefix = newPrefix(`${model.toLowerCase()}-queries`)
      await insertMany(prefix)
      const operations: Array<{
        model: string | undefined
        operation: string
      }> = []
      const instrumentedDb = db.$extends({
        query: {
          $allModels: {
            async $allOperations({ args, model: current, operation, query }) {
              operations.push({ model: current, operation })
              return query(args)
            },
          },
        },
      })
      vi.doMock("@/server/db", () => ({ db: instrumentedDb }))
      vi.resetModules()

      const rows = rowsOf(await (await load()).findMany({ take: 100 }))

      expect(rows).toHaveLength(100)
      expect(
        operations.filter(
          ({ model: current, operation }) =>
            current === model && operation === "findMany",
        ),
      ).toHaveLength(1)
      expect(operations).toHaveLength(1)
    },
    30_000,
  )
})
