import { randomUUID } from "node:crypto"

import { afterEach, describe, expect, it } from "vitest"

import { db } from "@/server/db"

type PromptRepositoryModule = {
  findBySlug: (
    slug: string,
    options: Readonly<{ includeBody: boolean }>,
  ) => Promise<unknown>
  findMetaBySlug: (slug: string) => Promise<unknown>
}

type PremiumFixture = Readonly<{
  body: string
  excerpt: string
  id: string
  slug: string
}>

const createdSlugs = new Set<string>()

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

function isPromptRepositoryModule(
  value: unknown,
): value is PromptRepositoryModule {
  return (
    isRecord(value) &&
    typeof value.findBySlug === "function" &&
    typeof value.findMetaBySlug === "function"
  )
}

async function loadRepository(): Promise<PromptRepositoryModule> {
  const module: unknown =
    await import("@/server/repositories/prompt-repository")
  if (!isPromptRepositoryModule(module)) {
    throw new Error(
      "prompt-repository doit exporter findMetaBySlug et findBySlug",
    )
  }
  return module
}

async function expectPostgreSql(): Promise<void> {
  const rows = await db.$queryRaw<
    Array<{ version: string }>
  >`SELECT version() AS version`
  expect(rows[0]?.version).toMatch(/PostgreSQL 16/i)
}

async function insertPremiumPrompt(): Promise<PremiumFixture> {
  const suffix = randomUUID()
  const fixture = {
    body: `CORPS-PREMIUM-${suffix}`,
    excerpt: `EXTRAIT-PUBLIC-${suffix}`,
    id: `premium-${suffix}`,
    slug: `premium-${suffix}`,
  }
  createdSlugs.add(fixture.slug)
  await db.$executeRaw`
    INSERT INTO "Prompt" (
      "id", "slug", "title", "summary", "excerpt", "tags", "visibility",
      "body", "createdAt", "updatedAt"
    )
    VALUES (
      ${fixture.id}, ${fixture.slug}, 'Prompt premium', 'Résumé public',
      ${fixture.excerpt}, ARRAY['business', 'ia']::text[], 'PREMIUM'::"Visibility",
      ${fixture.body}, NOW(), NOW()
    )
  `
  return fixture
}

afterEach(async () => {
  for (const slug of createdSlugs) {
    await db.$executeRaw`DELETE FROM "Prompt" WHERE "slug" = ${slug}`
  }
  createdSlugs.clear()
})

describe("repository de détail premium sur PostgreSQL", () => {
  it(
    scenario(
      "Le modèle persiste une visibilité par contenu et un excerpt distinct du body",
      "une vraie base PostgreSQL 16 migrée pour le modèle premium",
      "le catalogue et les valeurs par défaut de Prompt sont interrogés directement",
      "l'enum Visibility contient FREE et PREMIUM, Prompt possède visibility, body, excerpt et tags, et une insertion sans visibilité reçoit FREE",
    ),
    async () => {
      await expectPostgreSql()
      const columns = await db.$queryRaw<
        Array<{ columnDefault: string | null; columnName: string }>
      >`
        SELECT column_name AS "columnName", column_default AS "columnDefault"
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Prompt'
          AND column_name IN ('body', 'excerpt', 'tags', 'visibility')
        ORDER BY column_name
      `
      const enumValues = await db.$queryRaw<Array<{ value: string }>>`
        SELECT enumlabel AS value
        FROM pg_enum
        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
        WHERE pg_type.typname = 'Visibility'
        ORDER BY enumsortorder
      `

      expect(columns.map((column) => column.columnName)).toEqual([
        "body",
        "excerpt",
        "tags",
        "visibility",
      ])
      expect(
        columns.find((column) => column.columnName === "visibility")
          ?.columnDefault,
      ).toMatch(/FREE/)
      expect(enumValues).toEqual([{ value: "FREE" }, { value: "PREMIUM" }])

      const suffix = randomUUID()
      const slug = `default-free-${suffix}`
      createdSlugs.add(slug)
      await db.$executeRaw`
        INSERT INTO "Prompt" (
          "id", "slug", "title", "summary", "excerpt", "tags", "body",
          "createdAt", "updatedAt"
        )
        VALUES (
          ${`default-free-${suffix}`}, ${slug}, 'Prompt libre', 'Résumé libre',
          'Extrait libre', ARRAY['libre']::text[], 'Corps libre', NOW(), NOW()
        )
      `
      const inserted = await db.$queryRaw<Array<{ visibility: string }>>`
        SELECT "visibility"::text AS visibility
        FROM "Prompt"
        WHERE "slug" = ${slug}
      `
      expect(inserted).toEqual([{ visibility: "FREE" }])
    },
  )

  it(
    scenario(
      "La lecture non entitled ne sélectionne jamais le corps premium",
      "un vrai prompt PREMIUM dont excerpt et body portent deux sentinelles différentes",
      "findBySlug est appelé avec includeBody false",
      "la row contient exactement les champs publics et la clé body est totalement absente, pas undefined ni null",
    ),
    async () => {
      const repository = await loadRepository()
      await expectPostgreSql()
      const fixture = await insertPremiumPrompt()

      const row = await repository.findBySlug(fixture.slug, {
        includeBody: false,
      })

      expect(isRecord(row)).toBe(true)
      if (!isRecord(row)) {
        throw new Error("findBySlug doit retourner une row")
      }
      expect(Object.keys(row).sort()).toEqual([
        "excerpt",
        "id",
        "slug",
        "summary",
        "tags",
        "title",
        "visibility",
      ])
      expect(row.excerpt).toBe(fixture.excerpt)
      expect(Object.prototype.hasOwnProperty.call(row, "body")).toBe(false)
      expect(JSON.stringify(row)).not.toContain(fixture.body)
    },
  )

  it(
    scenario(
      "La lecture entitled sélectionne explicitement le corps premium",
      "un vrai prompt PREMIUM en PostgreSQL",
      "findBySlug est appelé avec includeBody true",
      "la row complète contient body en plus des mêmes champs publics et le corps persisté est intact",
    ),
    async () => {
      const repository = await loadRepository()
      await expectPostgreSql()
      const fixture = await insertPremiumPrompt()

      const row = await repository.findBySlug(fixture.slug, {
        includeBody: true,
      })

      expect(isRecord(row)).toBe(true)
      if (!isRecord(row)) {
        throw new Error("findBySlug doit retourner une row")
      }
      expect(Object.keys(row).sort()).toEqual([
        "body",
        "excerpt",
        "id",
        "slug",
        "summary",
        "tags",
        "title",
        "visibility",
      ])
      expect(row.body).toBe(fixture.body)
    },
  )

  it(
    scenario(
      "La première lecture de métadonnées ne transporte aucune donnée éditoriale",
      "un vrai prompt PREMIUM avec un corps et un extrait identifiables",
      "findMetaBySlug détermine la visibilité avant la décision d'accès",
      "la row de métadonnées contient exactement visibility et ne charge ni body, ni excerpt, ni résumé",
    ),
    async () => {
      const repository = await loadRepository()
      await expectPostgreSql()
      const fixture = await insertPremiumPrompt()

      const meta = await repository.findMetaBySlug(fixture.slug)

      expect(meta).toEqual({ visibility: "PREMIUM" })
      expect(JSON.stringify(meta)).not.toContain(fixture.body)
      expect(JSON.stringify(meta)).not.toContain(fixture.excerpt)
    },
  )
})
