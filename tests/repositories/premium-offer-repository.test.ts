import { randomUUID } from "node:crypto"

import { afterEach, describe, expect, it } from "vitest"

import { db } from "@/server/db"

type PremiumCounts = Readonly<{
  formations: number
  jeux: number
  opportunites: number
  prompts: number
}>

type PremiumOfferRepository = Readonly<{
  getPremiumContentCounts: () => Promise<PremiumCounts>
}>

const prefixes = new Set<string>()

function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isCounts(value: unknown): value is PremiumCounts {
  return (
    isRecord(value) &&
    typeof value.formations === "number" &&
    typeof value.jeux === "number" &&
    typeof value.opportunites === "number" &&
    typeof value.prompts === "number"
  )
}

function isGetPremiumContentCounts(
  value: unknown,
): value is PremiumOfferRepository["getPremiumContentCounts"] {
  return typeof value === "function"
}

async function loadRepository(): Promise<PremiumOfferRepository> {
  const modulePath = "@/server/repositories/premium-offer-repository"
  const module: unknown = await import(modulePath)
  if (
    !isRecord(module) ||
    !isGetPremiumContentCounts(module.getPremiumContentCounts)
  ) {
    throw new Error(
      "premium-offer-repository doit exposer getPremiumContentCounts",
    )
  }
  return { getPremiumContentCounts: module.getPremiumContentCounts }
}

async function insertVisibilityFixtures(prefix: string): Promise<void> {
  prefixes.add(prefix)
  for (const [suffix, visibility, published] of [
    ["premium-published", "PREMIUM", true],
    ["premium-draft", "PREMIUM", false],
    ["free-published", "FREE", true],
  ] as const) {
    const publishedAt = published ? new Date() : null
    const id = `${prefix}-${suffix}`
    await db.$executeRaw`
      INSERT INTO "Prompt" (
        "id", "slug", "title", "summary", "excerpt", "body", "domain",
        "tags", "coverImage", "visibility", "publishedAt", "createdAt", "updatedAt"
      ) VALUES (
        ${`${id}-prompt`}, ${`${id}-prompt`}, ${`Prompt ${id}`}, 'Résumé',
        'Extrait', 'Corps', 'ia'::"PromptDomain", ARRAY[]::TEXT[], NULL,
        ${visibility}::"Visibility", ${publishedAt}, NOW(), NOW()
      )
    `
    await db.$executeRaw`
      INSERT INTO "Formation" (
        "id", "slug", "title", "summary", "excerpt", "body", "visibility",
        "publishedAt", "level", "format", "durationH", "kind", "startsAt",
        "coverImage", "createdAt", "updatedAt"
      ) VALUES (
        ${`${id}-formation`}, ${`${id}-formation`}, ${`Formation ${id}`},
        'Résumé', 'Extrait', 'Corps', ${visibility}::"Visibility",
        ${publishedAt}, 'DEBUTANT'::"Level", 'EN_LIGNE'::"Format", 2,
        'PERMANENTE'::"FormationKind", NULL, NULL, NOW(), NOW()
      )
    `
    await db.$executeRaw`
      INSERT INTO "Jeu" (
        "id", "slug", "title", "summary", "excerpt", "body", "visibility",
        "startsAt", "closesAt", "capacity", "location", "coverImage",
        "publishedAt", "createdAt", "updatedAt"
      ) VALUES (
        ${`${id}-jeu`}, ${`${id}-jeu`}, ${`Jeu ${id}`}, 'Résumé', 'Extrait',
        'Corps', ${visibility}::"Visibility", NULL, NULL, NULL, 'Abidjan', NULL,
        ${publishedAt}, NOW(), NOW()
      )
    `
    await db.$executeRaw`
      INSERT INTO "Opportunite" (
        "id", "slug", "title", "summary", "excerpt", "body", "visibility",
        "publishedAt", "type", "organisme", "deadline", "externalUrl",
        "coverImage", "createdAt", "updatedAt"
      ) VALUES (
        ${`${id}-opportunite`}, ${`${id}-opportunite`}, ${`Opportunité ${id}`},
        'Résumé', 'Extrait', 'Corps', ${visibility}::"Visibility",
        ${publishedAt}, 'EMPLOI'::"OpportuniteType", 'Synapse', NULL, NULL, NULL,
        NOW(), NOW()
      )
    `
  }
}

afterEach(async () => {
  for (const prefix of prefixes) {
    const pattern = `${prefix}%`
    await db.$executeRaw`DELETE FROM "Prompt" WHERE "id" LIKE ${pattern}`
    await db.$executeRaw`DELETE FROM "Formation" WHERE "id" LIKE ${pattern}`
    await db.$executeRaw`DELETE FROM "Jeu" WHERE "id" LIKE ${pattern}`
    await db.$executeRaw`DELETE FROM "Opportunite" WHERE "id" LIKE ${pattern}`
  }
  prefixes.clear()
})

describe("volumes de l'offre premium sur PostgreSQL", () => {
  it(
    scenario(
      "Les volumes comptent uniquement ce que l'adhésion PREMIUM débloque",
      "dans chaque rubrique, un contenu PREMIUM publié, un PREMIUM brouillon et un FREE publié ajoutés au catalogue existant",
      "le repository relit les quatre volumes après insertion",
      "chaque compteur augmente exactement de un : FREE et brouillons sont exclus dans Prompts, Formations, Jeux et Opportunités",
    ),
    async () => {
      const repository = await loadRepository()
      const before = await repository.getPremiumContentCounts()
      expect(isCounts(before)).toBe(true)
      const prefix = `t10-offer-${randomUUID()}`

      await insertVisibilityFixtures(prefix)
      const after = await repository.getPremiumContentCounts()

      expect(after).toEqual({
        formations: before.formations + 1,
        jeux: before.jeux + 1,
        opportunites: before.opportunites + 1,
        prompts: before.prompts + 1,
      })
    },
  )
})
