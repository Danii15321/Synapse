import { afterEach, describe, expect, it } from "vitest"

import {
  cleanupJeuxInscriptions,
  insertJeu,
  isRecord,
  newPrefix,
  scenario,
} from "./jeux-inscriptions-fixtures"

type JeuRepository = Readonly<{
  findBySlug: (
    slug: string,
    options: Readonly<{ includeBody: boolean }>,
  ) => Promise<unknown>
  findMany: (options: Readonly<Record<string, unknown>>) => Promise<unknown>
  findMetaBySlug: (slug: string) => Promise<unknown>
}>

function isJeuRepository(value: unknown): value is JeuRepository {
  return (
    isRecord(value) &&
    typeof value.findBySlug === "function" &&
    typeof value.findMany === "function" &&
    typeof value.findMetaBySlug === "function"
  )
}

async function loadRepository(): Promise<JeuRepository> {
  const module: unknown = await import("@/server/repositories/jeu-repository")
  if (!isJeuRepository(module)) {
    throw new Error("jeu-repository doit exposer liste, méta et détail")
  }
  return module
}

function rowsOf(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error("findMany doit retourner des rows")
  }
  return value
}

afterEach(cleanupJeuxInscriptions)

describe("repository Jeux sur PostgreSQL", () => {
  it(
    scenario(
      "La liste ne charge jamais les règles ni l'extrait détaillé",
      "un concours PREMIUM publié avec des règles sentinelles",
      "findMany construit une page de cartes bornée",
      "la row publique contient les métadonnées utiles sans body ni excerpt et la sentinelle reste hors mémoire",
    ),
    async () => {
      const prefix = newPrefix("jeu-select")
      const jeuId = await insertJeu(prefix, { visibility: "PREMIUM" })
      const repository = await loadRepository()

      const rows = rowsOf(await repository.findMany({ take: 100 }))
      const row = rows.find(({ id }) => id === jeuId)

      expect(row).toBeDefined()
      expect(Object.prototype.hasOwnProperty.call(row, "body")).toBe(false)
      expect(Object.prototype.hasOwnProperty.call(row, "excerpt")).toBe(false)
      expect(JSON.stringify(row)).not.toContain(`REGLES-SECRETES-${prefix}`)
    },
  )

  it(
    scenario(
      "Le teaser premium est filtré par le select Prisma",
      "un concours PREMIUM publié avec excerpt public et body verrouillé",
      "findBySlug est appelé sans entitlement puis avec entitlement",
      "la première row possède excerpt sans clé body tandis que la seconde contient les règles complètes",
    ),
    async () => {
      const prefix = newPrefix("jeu-premium")
      await insertJeu(prefix, { visibility: "PREMIUM" })
      const repository = await loadRepository()

      const teaser = await repository.findBySlug(`${prefix}-jeu`, {
        includeBody: false,
      })
      const full = await repository.findBySlug(`${prefix}-jeu`, {
        includeBody: true,
      })

      expect(isRecord(teaser)).toBe(true)
      expect(Object.prototype.hasOwnProperty.call(teaser, "excerpt")).toBe(true)
      expect(Object.prototype.hasOwnProperty.call(teaser, "body")).toBe(false)
      expect(JSON.stringify(teaser)).not.toContain(`REGLES-SECRETES-${prefix}`)
      expect(full).toMatchObject({ body: `REGLES-SECRETES-${prefix}` })
    },
  )

  it(
    scenario(
      "Un concours non publié n'est accessible ni en liste ni en détail",
      "un concours publié et un brouillon",
      "la liste, les métadonnées et le détail du brouillon sont demandés",
      "seul le publié apparaît et les deux lectures du brouillon retournent null",
    ),
    async () => {
      const publishedPrefix = newPrefix("jeu-published")
      const draftPrefix = newPrefix("jeu-draft")
      const publishedId = await insertJeu(publishedPrefix)
      const draftId = await insertJeu(draftPrefix, { published: false })
      const repository = await loadRepository()

      const rows = rowsOf(await repository.findMany({ take: 100 }))
      const meta = await repository.findMetaBySlug(`${draftPrefix}-jeu`)
      const detail = await repository.findBySlug(`${draftPrefix}-jeu`, {
        includeBody: true,
      })

      expect(rows.map(({ id }) => id)).toContain(publishedId)
      expect(rows.map(({ id }) => id)).not.toContain(draftId)
      expect(meta).toBeNull()
      expect(detail).toBeNull()
    },
  )
})
