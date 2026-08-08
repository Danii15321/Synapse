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

type FormationRepository = Readonly<{
  findBySlug: (
    slug: string,
    options: Readonly<{ includeBody: boolean }>,
  ) => Promise<unknown>
  findMany: (options: Readonly<Record<string, unknown>>) => Promise<unknown>
  findMetaBySlug: (slug: string) => Promise<unknown>
}>

type OpportuniteRepository = Readonly<{
  findBySlug: (
    slug: string,
    options: Readonly<{ includeLockedFields: boolean }>,
  ) => Promise<unknown>
  findMany: (options: Readonly<Record<string, unknown>>) => Promise<unknown>
  findMetaBySlug: (slug: string) => Promise<unknown>
}>

function isFormationRepository(value: unknown): value is FormationRepository {
  return (
    isRecord(value) &&
    typeof value.findMany === "function" &&
    typeof value.findMetaBySlug === "function" &&
    typeof value.findBySlug === "function"
  )
}

function isOpportuniteRepository(
  value: unknown,
): value is OpportuniteRepository {
  return (
    isRecord(value) &&
    typeof value.findMany === "function" &&
    typeof value.findMetaBySlug === "function" &&
    typeof value.findBySlug === "function"
  )
}

async function loadFormationRepository(): Promise<FormationRepository> {
  const module: unknown =
    await import("@/server/repositories/formation-repository")
  if (!isFormationRepository(module)) {
    throw new Error("formation-repository doit exposer le patron complet")
  }
  return module
}

async function loadOpportuniteRepository(): Promise<OpportuniteRepository> {
  const module: unknown =
    await import("@/server/repositories/opportunite-repository")
  if (!isOpportuniteRepository(module)) {
    throw new Error("opportunite-repository doit exposer le patron complet")
  }
  return module
}

afterEach(cleanupReplicatedContent)

describe("repositories Formations et Opportunités sur PostgreSQL", () => {
  it(
    scenario(
      "Une formation événementielle passée sort de la liste mais une permanente reste consultable",
      "une permanente sans date, un événement futur et un événement passé, tous publiés",
      "findMany construit la liste principale",
      "la permanente et l'événement futur sont présents, l'événement passé est filtré en base",
    ),
    async () => {
      const permanent = newPrefix("formation-permanente")
      const future = newPrefix("formation-future")
      const past = newPrefix("formation-past")
      await insertFormation(permanent)
      await insertFormation(future, {
        kind: "EVENEMENTIELLE",
        startsAt: new Date(Date.now() + 86_400_000),
      })
      await insertFormation(past, {
        kind: "EVENEMENTIELLE",
        startsAt: new Date(Date.now() - 86_400_000),
      })
      const repository = await loadFormationRepository()

      const rows = rowsOf(await repository.findMany({ take: 100 }))
      const ids = rows.map(({ id }) => id)

      expect(ids).toContain(`${permanent}-id`)
      expect(ids).toContain(`${future}-id`)
      expect(ids).not.toContain(`${past}-id`)
    },
  )

  it(
    scenario(
      "Une opportunité périmée n'est accessible ni en liste ni par son slug",
      "une opportunité future et une autre dont deadline est passée",
      "findMany puis les lectures de détail sont appelés",
      "seule l'opportunité future est listée et les métadonnées comme le détail de l'expirée retournent null, sans archive v1",
    ),
    async () => {
      const future = newPrefix("opportunite-future")
      const past = newPrefix("opportunite-past")
      await insertOpportunite(future, {
        deadline: new Date(Date.now() + 86_400_000),
      })
      await insertOpportunite(past, {
        deadline: new Date(Date.now() - 86_400_000),
      })
      const repository = await loadOpportuniteRepository()

      const rows = rowsOf(await repository.findMany({ take: 100 }))
      const meta = await repository.findMetaBySlug(`${past}-slug`)
      const detail = await repository.findBySlug(`${past}-slug`, {
        includeLockedFields: true,
      })

      expect(rows.map(({ id }) => id)).toContain(`${future}-id`)
      expect(rows.map(({ id }) => id)).not.toContain(`${past}-id`)
      expect(meta).toBeNull()
      expect(detail).toBeNull()
    },
  )

  it(
    scenario(
      "La liste Formation ne charge aucun champ verrouillé ni détail éditorial",
      "une formation PREMIUM publiée avec un body sentinelle",
      "findMany lit une page de cartes Formation",
      "la row ne contient ni body ni excerpt et la sentinelle reste hors mémoire",
    ),
    async () => {
      const prefix = newPrefix("select-formation")
      const body = `SECRET-BODY-${prefix}`
      await insertFormation(prefix, { body, visibility: "PREMIUM" })
      const repository = await loadFormationRepository()

      const rows = rowsOf(await repository.findMany({ take: 100 }))
      const row = rows.find(({ id }) => id === `${prefix}-id`)

      expect(row).toBeDefined()
      expect(Object.prototype.hasOwnProperty.call(row, "body")).toBe(false)
      expect(Object.prototype.hasOwnProperty.call(row, "excerpt")).toBe(false)
      expect(JSON.stringify(row)).not.toContain(body)
    },
  )

  it(
    scenario(
      "La liste Opportunités ne charge aucun champ verrouillé ni détail éditorial",
      "une opportunité PREMIUM publiée avec body et externalUrl sentinelles",
      "findMany lit une page de cartes Opportunité",
      "la row ne contient ni body, ni excerpt, ni externalUrl et les sentinelles restent hors mémoire",
    ),
    async () => {
      const prefix = newPrefix("select-opportunite")
      const body = `SECRET-BODY-${prefix}`
      const externalUrl = `https://secret.example/${prefix}`
      await insertOpportunite(prefix, {
        body,
        externalUrl,
        visibility: "PREMIUM",
      })
      const repository = await loadOpportuniteRepository()

      const rows = rowsOf(await repository.findMany({ take: 100 }))
      const row = rows.find(({ id }) => id === `${prefix}-id`)

      expect(row).toBeDefined()
      expect(Object.prototype.hasOwnProperty.call(row, "body")).toBe(false)
      expect(Object.prototype.hasOwnProperty.call(row, "excerpt")).toBe(false)
      expect(Object.prototype.hasOwnProperty.call(row, "externalUrl")).toBe(
        false,
      )
      expect(JSON.stringify(row)).not.toContain(body)
      expect(JSON.stringify(row)).not.toContain(externalUrl)
    },
  )

  it(
    scenario(
      "Le détail non entitled ne sélectionne ni body ni externalUrl d'une opportunité premium",
      "une opportunité PREMIUM dont le corps et le lien portent des sentinelles distinctes",
      "findBySlug est appelé avec includeLockedFields false",
      "la row teaser contient l'excerpt mais aucune clé body ou externalUrl, tandis que la lecture entitled les contient toutes deux",
    ),
    async () => {
      const prefix = newPrefix("opportunite-locked")
      const body = `BODY-${prefix}`
      const externalUrl = `https://secret.example/${prefix}`
      await insertOpportunite(prefix, {
        body,
        externalUrl,
        visibility: "PREMIUM",
      })
      const repository = await loadOpportuniteRepository()

      const teaser = await repository.findBySlug(`${prefix}-slug`, {
        includeLockedFields: false,
      })
      const full = await repository.findBySlug(`${prefix}-slug`, {
        includeLockedFields: true,
      })

      expect(isRecord(teaser)).toBe(true)
      expect(Object.prototype.hasOwnProperty.call(teaser, "body")).toBe(false)
      expect(Object.prototype.hasOwnProperty.call(teaser, "externalUrl")).toBe(
        false,
      )
      expect(JSON.stringify(teaser)).not.toContain(body)
      expect(JSON.stringify(teaser)).not.toContain(externalUrl)
      expect(full).toMatchObject({ body, externalUrl })
    },
  )
})
