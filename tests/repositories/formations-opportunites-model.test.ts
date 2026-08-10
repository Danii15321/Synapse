import { describe, expect, it } from "vitest"

import { db } from "@/server/db"

import { scenario } from "./replicated-content-fixtures"

describe("modèles Formation et Opportunite sur PostgreSQL", () => {
  it(
    scenario(
      "Les modèles métier et leurs index existent dans la vraie base",
      "PostgreSQL migré pour les deux rubriques répliquées",
      "les colonnes, enums et index de Formation et Opportunite sont interrogés",
      "les champs contractuels existent, FormationKind vaut PERMANENTE/EVENEMENTIELLE et les index couvrent publishedAt, startsAt, kind, level, deadline et type",
    ),
    async () => {
      const columns = await db.$queryRaw<
        Array<{ name: string; tableName: string }>
      >`
        SELECT table_name AS "tableName", column_name AS name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('Formation', 'Opportunite')
      `
      const namesFor = (tableName: string) =>
        columns
          .filter((column) => column.tableName === tableName)
          .map((column) => column.name)
      expect(namesFor("Formation")).toEqual(
        expect.arrayContaining([
          "id",
          "slug",
          "title",
          "summary",
          "excerpt",
          "body",
          "visibility",
          "publishedAt",
          "level",
          "format",
          "durationH",
          "kind",
          "startsAt",
          "coverImage",
          "createdAt",
          "updatedAt",
        ]),
      )
      expect(namesFor("Opportunite")).toEqual(
        expect.arrayContaining([
          "id",
          "slug",
          "title",
          "summary",
          "excerpt",
          "body",
          "visibility",
          "publishedAt",
          "type",
          "organisme",
          "deadline",
          "externalUrl",
          "coverImage",
          "createdAt",
          "updatedAt",
        ]),
      )
      const kindValues = await db.$queryRaw<Array<{ value: string }>>`
        SELECT pg_enum.enumlabel AS value FROM pg_enum
        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
        JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
        WHERE pg_namespace.nspname = 'public'
          AND pg_type.typname = 'FormationKind'
        ORDER BY pg_enum.enumsortorder
      `
      expect(kindValues.map(({ value }) => value)).toEqual([
        "PERMANENTE",
        "EVENEMENTIELLE",
      ])
      const indexes = await db.$queryRaw<
        Array<{ definition: string; tableName: string }>
      >`
        SELECT tablename AS "tableName", indexdef AS definition
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename IN ('Formation', 'Opportunite')
      `
      const definitions = (tableName: string) =>
        indexes
          .filter((index) => index.tableName === tableName)
          .map((index) => index.definition)
          .join("\n")
      const indexedColumn = (column: string) =>
        new RegExp(`(?:^|[^A-Za-z0-9_])"?${column}"?(?=$|[^A-Za-z0-9_])`, "u")
      for (const column of ["publishedAt", "startsAt", "kind", "level"]) {
        expect(definitions("Formation")).toMatch(indexedColumn(column))
      }
      for (const column of ["publishedAt", "deadline", "type"]) {
        expect(definitions("Opportunite")).toMatch(indexedColumn(column))
      }
    },
  )
})
