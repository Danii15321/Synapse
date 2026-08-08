import { afterEach, describe, expect, it } from "vitest"

import {
  cleanupReplicatedContent,
  insertFormation,
  insertOpportunite,
  isRecord,
  newPrefix,
  rowsOf,
  scenario,
} from "./replicated-content-fixtures"

type Repository = Readonly<{
  findBySlug: (
    slug: string,
    options: Readonly<Record<string, boolean>>,
  ) => Promise<unknown>
  findMany: (options: Readonly<Record<string, unknown>>) => Promise<unknown>
  findMetaBySlug: (slug: string) => Promise<unknown>
}>

function isRepository(value: unknown): value is Repository {
  return (
    isRecord(value) &&
    typeof value.findMany === "function" &&
    typeof value.findMetaBySlug === "function" &&
    typeof value.findBySlug === "function"
  )
}

async function formations(): Promise<Repository> {
  const module: unknown =
    await import("@/server/repositories/formation-repository")
  if (!isRepository(module)) throw new Error("repository Formation incomplet")
  return module
}

async function opportunites(): Promise<Repository> {
  const module: unknown =
    await import("@/server/repositories/opportunite-repository")
  if (!isRepository(module)) throw new Error("repository Opportunite incomplet")
  return module
}

afterEach(cleanupReplicatedContent)

describe("filtres combinés et publication des rubriques répliquées", () => {
  it(
    scenario(
      "Les filtres Formation sont combinés en base et les brouillons restent introuvables",
      "une permanente débutant publiée, une événementielle avancée et un brouillon permanent",
      "findMany filtre kind, level et recherche puis le brouillon est demandé par slug",
      "seule la permanente débutant correspond et le brouillon est absent de la liste comme du détail",
    ),
    async () => {
      const matching = newPrefix("formation-filter-match")
      const wrong = newPrefix("formation-filter-wrong")
      const draft = newPrefix("formation-filter-draft")
      await insertFormation(matching, { kind: "PERMANENTE", level: "DEBUTANT" })
      await insertFormation(wrong, {
        kind: "EVENEMENTIELLE",
        level: "AVANCE",
        startsAt: new Date(Date.now() + 86_400_000),
      })
      await insertFormation(draft, { published: false })
      const repository = await formations()

      const rows = rowsOf(
        await repository.findMany({
          kind: "PERMANENTE",
          level: "DEBUTANT",
          search: matching,
          take: 20,
        }),
      )

      expect(rows.map(({ id }) => id)).toEqual([`${matching}-id`])
      expect(await repository.findMetaBySlug(`${draft}-slug`)).toBeNull()
      expect(
        await repository.findBySlug(`${draft}-slug`, { includeBody: true }),
      ).toBeNull()
    },
  )

  it(
    scenario(
      "Les filtres Opportunité sont combinés en base et les brouillons restent introuvables",
      "un stage publié, un emploi publié et un stage brouillon",
      "findMany filtre type et recherche puis le brouillon est demandé par slug",
      "seul le stage publié correspond et le brouillon est absent de la liste comme du détail",
    ),
    async () => {
      const matching = newPrefix("opportunite-filter-match")
      const wrong = newPrefix("opportunite-filter-wrong")
      const draft = newPrefix("opportunite-filter-draft")
      await insertOpportunite(matching, { type: "STAGE" })
      await insertOpportunite(wrong, { type: "EMPLOI" })
      await insertOpportunite(draft, { published: false, type: "STAGE" })
      const repository = await opportunites()

      const rows = rowsOf(
        await repository.findMany({
          search: matching,
          take: 20,
          type: "STAGE",
        }),
      )

      expect(rows.map(({ id }) => id)).toEqual([`${matching}-id`])
      expect(await repository.findMetaBySlug(`${draft}-slug`)).toBeNull()
      expect(
        await repository.findBySlug(`${draft}-slug`, {
          includeLockedFields: true,
        }),
      ).toBeNull()
    },
  )
})
