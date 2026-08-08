import { afterEach, describe, expect, it } from "vitest"

import { db } from "@/server/db"

import {
  cleanupPromptFixtures,
  insertPrompt,
  isRecord,
  loadRepository,
  newPrefix,
  rowsOf,
  scenario,
} from "./prompt-catalog-fixtures"

afterEach(cleanupPromptFixtures)

describe("modèle et sélection du catalogue Prompt sur PostgreSQL", () => {
  it(
    scenario(
      "Le modèle Prompt complet ferme les domaines et indexe la publication avec le domaine",
      "PostgreSQL 16 migré pour la tranche de référence",
      "le catalogue SQL, l'enum relié à Prompt.domain et les index sont interrogés",
      "Prompt expose tous les champs du contrat, l'enum vaut exactement ia, entrepreneuriat, productivite, communication, et un index commence par publishedAt puis domain",
    ),
    async () => {
      const columns = await db.$queryRaw<
        Array<{
          dataType: string
          isNullable: "NO" | "YES"
          name: string
          udtName: string
        }>
      >`
        SELECT column_name AS name, data_type AS "dataType",
          is_nullable AS "isNullable", udt_name AS "udtName"
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Prompt'
      `
      const domainColumn = columns.find((column) => column.name === "domain")
      const columnNames = columns.map((column) => column.name)
      expect(columnNames).toEqual(
        expect.arrayContaining([
          "id",
          "slug",
          "title",
          "summary",
          "excerpt",
          "body",
          "domain",
          "tags",
          "coverImage",
          "visibility",
          "publishedAt",
          "createdAt",
          "updatedAt",
        ]),
      )
      expect(
        columnNames.some((name) => /^(?:author|auteur)$/iu.test(name)),
      ).toBe(false)
      expect(domainColumn?.dataType).toBe("USER-DEFINED")
      expect(domainColumn?.isNullable).toBe("NO")
      expect(columns.find(({ name }) => name === "excerpt")?.isNullable).toBe(
        "YES",
      )
      expect(
        columns.find(({ name }) => name === "coverImage")?.isNullable,
      ).toBe("YES")
      expect(
        columns.find(({ name }) => name === "publishedAt")?.isNullable,
      ).toBe("YES")

      const enumValues = await db.$queryRaw<Array<{ value: string }>>`
        SELECT enumlabel AS value FROM pg_enum
        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
        WHERE pg_type.typname = ${domainColumn?.udtName ?? "enum-absent"}
        ORDER BY enumsortorder
      `
      expect(enumValues.map(({ value }) => value)).toEqual([
        "ia",
        "entrepreneuriat",
        "productivite",
        "communication",
      ])
      const indexes = await db.$queryRaw<Array<{ definition: string }>>`
        SELECT indexdef AS definition FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'Prompt'
      `
      expect(
        indexes.some(({ definition }) =>
          /\("publishedAt",\s*(?:"domain"|domain)\)/u.test(definition),
        ),
      ).toBe(true)
    },
  )

  it(
    scenario(
      "La liste ne charge que les champs publics de la carte de référence",
      "un prompt PREMIUM publié dont le corps porte une sentinelle",
      "findMany lit une page filtrée sur son tag",
      "la row contient exactement id, slug, title, summary, domain, tags, coverImage et visibility, sans body, excerpt ni timestamp",
    ),
    async () => {
      const prefix = newPrefix("select")
      const body = `CORPS-SECRET-${prefix}`
      await insertPrompt(prefix, {
        body,
        domain: "entrepreneuriat",
        tags: [prefix, "business-plan"],
        visibility: "PREMIUM",
      })
      const repository = await loadRepository()

      const rows = rowsOf(await repository.findMany({ tag: prefix, take: 10 }))

      expect(rows).toHaveLength(1)
      expect(Object.keys(rows[0] ?? {}).sort()).toEqual([
        "coverImage",
        "domain",
        "id",
        "slug",
        "summary",
        "tags",
        "title",
        "visibility",
      ])
      expect(JSON.stringify(rows)).not.toContain(body)
      expect(Object.prototype.hasOwnProperty.call(rows[0], "body")).toBe(false)
      expect(Object.prototype.hasOwnProperty.call(rows[0], "excerpt")).toBe(
        false,
      )
    },
  )

  it(
    scenario(
      "Les filtres et la recherche sont combinés dans le repository et les brouillons restent absents",
      "un publié correspondant, un brouillon correspondant, un autre domaine et un autre tag",
      "findMany reçoit domain ia, tag strategie et la recherche CROISSANCE",
      "seul le publié dont title ou summary correspond en ILIKE est retourné et aucun brouillon n'atteint la présentation",
    ),
    async () => {
      const matching = newPrefix("matching")
      const draft = newPrefix("draft")
      const wrongDomain = newPrefix("domain")
      const wrongTag = newPrefix("tag")
      await insertPrompt(matching, {
        domain: "ia",
        summary: "Accélérer sa croissance",
        tags: ["strategie"],
      })
      await insertPrompt(draft, {
        domain: "ia",
        published: false,
        summary: "Croissance secrète",
        tags: ["strategie"],
      })
      await insertPrompt(wrongDomain, {
        domain: "communication",
        summary: "Croissance publique",
        tags: ["strategie"],
      })
      await insertPrompt(wrongTag, {
        domain: "ia",
        summary: "Croissance publique",
        tags: ["marketing"],
      })
      const repository = await loadRepository()

      const rows = rowsOf(
        await repository.findMany({
          domain: "ia",
          search: "CROISSANCE",
          tag: "strategie",
          take: 20,
        }),
      )

      expect(rows.map((row) => row.id)).toEqual([`${matching}-id`])
      expect(JSON.stringify(rows)).not.toContain(draft)
    },
  )

  it(
    scenario(
      "Un brouillon est introuvable même par son slug exact",
      "un prompt dont publishedAt vaut null",
      "findMetaBySlug puis findBySlug tentent une lecture directe",
      "les deux lectures retournent null et ni teaser ni body ne peuvent atteindre le service",
    ),
    async () => {
      const prefix = newPrefix("draft-detail")
      await insertPrompt(prefix, { published: false })
      const repository = await loadRepository()

      const meta = await repository.findMetaBySlug(`${prefix}-slug`)
      const detail = await repository.findBySlug(`${prefix}-slug`, {
        includeBody: true,
      })

      expect(meta).toBeNull()
      expect(detail).toBeNull()
      expect(isRecord(meta)).toBe(false)
    },
  )
})
