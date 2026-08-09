import { afterEach, describe, expect, it } from "vitest"

import { db } from "@/server/db"

import {
  cleanupJeuxInscriptions,
  insertJeu,
  insertUser,
  newPrefix,
  scenario,
} from "./jeux-inscriptions-fixtures"

afterEach(cleanupJeuxInscriptions)

describe("modèles Jeu et Inscription sur PostgreSQL", () => {
  it(
    scenario(
      "Le jeu et la participation possèdent les champs, relations et index contractuels",
      "une vraie base PostgreSQL migrée pour la tranche Jeux et inscriptions",
      "le catalogue PostgreSQL est interrogé directement",
      "Jeu porte présentation, verrouillage, dates, capacité et lieu ; Inscription relie User à Jeu avec un index jeuId et une unicité userId plus jeuId",
    ),
    async () => {
      const columns = await db.$queryRaw<
        Array<{ columnName: string; tableName: string }>
      >`
        SELECT table_name AS "tableName", column_name AS "columnName"
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('Jeu', 'Inscription')
      `
      const namesFor = (tableName: string) =>
        columns
          .filter((column) => column.tableName === tableName)
          .map((column) => column.columnName)

      expect(namesFor("Jeu")).toEqual(
        expect.arrayContaining([
          "id",
          "slug",
          "title",
          "summary",
          "excerpt",
          "body",
          "visibility",
          "startsAt",
          "closesAt",
          "capacity",
          "location",
          "coverImage",
          "publishedAt",
          "createdAt",
          "updatedAt",
        ]),
      )
      expect(namesFor("Inscription")).toEqual(
        expect.arrayContaining(["id", "userId", "jeuId", "createdAt"]),
      )

      const indexes = await db.$queryRaw<
        Array<{ definition: string; tableName: string }>
      >`
        SELECT tablename AS "tableName", indexdef AS definition
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename IN ('Jeu', 'Inscription')
      `
      const definitionsFor = (tableName: string) =>
        indexes
          .filter((index) => index.tableName === tableName)
          .map(({ definition }) => definition)
          .join("\n")
      expect(definitionsFor("Inscription")).toMatch(
        /UNIQUE[^\n]+"?userId"?[^\n]+"?jeuId"?/iu,
      )
      expect(definitionsFor("Inscription")).toMatch(/"?jeuId"?/u)
      expect(definitionsFor("Jeu")).toMatch(/"?publishedAt"?/u)
    },
  )

  it(
    scenario(
      "La base tranche deux créations concurrentes pour le même membre et le même jeu",
      "un membre et un jeu publié sans participation",
      "deux INSERT strictement simultanés visent la même paire userId jeuId",
      "une insertion réussit, l'autre viole l'unicité PostgreSQL et une seule ligne persiste",
    ),
    async () => {
      const prefix = newPrefix("unique")
      const userId = await insertUser(prefix)
      const jeuId = await insertJeu(prefix)

      const insert = () =>
        db.$executeRaw`
          INSERT INTO "Inscription" ("id", "userId", "jeuId", "createdAt")
          VALUES (${`${prefix}-${crypto.randomUUID()}`}, ${userId}, ${jeuId}, NOW())
        `
      const outcomes = await Promise.allSettled([insert(), insert()])
      const rows = await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) AS count
        FROM "Inscription"
        WHERE "userId" = ${userId} AND "jeuId" = ${jeuId}
      `

      expect(outcomes.map(({ status }) => status).sort()).toEqual([
        "fulfilled",
        "rejected",
      ])
      expect(Number(rows[0]?.count ?? 0)).toBe(1)
    },
  )

  it(
    scenario(
      "Une formation événementielle dispose d'un stockage de participation sans rendre la permanente participable",
      "la décision produit étend le parcours aux formations événementielles",
      "le schéma de la base est inspecté sans imposer une table unique ou séparée",
      "un lien persistant User vers Formation existe soit dans Inscription, soit dans une table FormationInscription dédiée",
    ),
    async () => {
      const columns = await db.$queryRaw<
        Array<{ columnName: string; tableName: string }>
      >`
        SELECT table_name AS "tableName", column_name AS "columnName"
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('Inscription', 'FormationInscription')
      `
      const unified = columns.some(
        ({ columnName, tableName }) =>
          tableName === "Inscription" && columnName === "formationId",
      )
      const dedicatedColumns = columns
        .filter(({ tableName }) => tableName === "FormationInscription")
        .map(({ columnName }) => columnName)

      expect(
        unified ||
          (["id", "userId", "formationId", "createdAt"] as const).every(
            (column) => dedicatedColumns.includes(column),
          ),
      ).toBe(true)
    },
  )
})
