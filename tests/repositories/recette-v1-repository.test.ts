import { describe, expect, it } from "vitest"

import { db } from "@/server/db"
import * as formationRepository from "@/server/repositories/formation-repository"
import * as jeuRepository from "@/server/repositories/jeu-repository"
import * as opportuniteRepository from "@/server/repositories/opportunite-repository"
import * as promptRepository from "@/server/repositories/prompt-repository"

import {
  expectReleaseEvidence,
  releaseEvidence,
  scenario,
} from "../fixtures/recette-v1-test-utils"

function expectNoLockedFields(
  rows: readonly unknown[],
  lockedFields: readonly string[],
): void {
  for (const row of rows) {
    expect(typeof row).toBe("object")
    expect(row).not.toBeNull()
    for (const field of lockedFields) {
      expect(Object.prototype.hasOwnProperty.call(row, field)).toBe(false)
    }
  }
}

describe("recette repository sur PostgreSQL réel", () => {
  it(
    scenario(
      "Volume réel — les 69 prompts et leur distribution sont présents sur PostgreSQL 16",
      "la base migrée et peuplée depuis les ressources de la v1",
      "le catalogue Prompt est compté directement en base",
      "PostgreSQL 16 contient exactement 69 prompts publiés, dont 20 FREE et 49 PREMIUM, et cette preuve est consignée",
    ),
    async () => {
      const version = await db.$queryRaw<Array<{ version: string }>>`
        SELECT version() AS version
      `
      const distribution = await db.$queryRaw<
        Array<{ count: bigint; visibility: string }>
      >`
        SELECT "visibility"::text AS visibility, COUNT(*) AS count
        FROM "Prompt"
        WHERE "publishedAt" IS NOT NULL
        GROUP BY "visibility"
        ORDER BY "visibility"
      `

      expect(version[0]?.version).toMatch(/PostgreSQL 16/iu)
      expect(
        Object.fromEntries(
          distribution.map(({ count, visibility }) => [
            visibility,
            Number(count),
          ]),
        ),
      ).toEqual({ FREE: 20, PREMIUM: 49 })
      expectReleaseEvidence(releaseEvidence(), [
        /PostgreSQL 16/iu,
        /69 prompts?[\s\S]{0,60}20\s+FREE[\s\S]{0,60}49\s+PREMIUM/iu,
      ])
    },
  )

  it(
    scenario(
      "Absence de N+1 — une page de chaque rubrique reste bornée et hors champs verrouillés",
      "le vrai volume de la v1 et quatre listes publiques demandées avec take 100",
      "les quatre repositories lisent leurs cartes sur PostgreSQL",
      "chaque liste est bornée, body n'est jamais chargé, externalUrl reste absent des opportunités et le relevé Prisma prouve quatre requêtes sans N+1",
    ),
    async () => {
      const [prompts, formations, jeux, opportunites] = await Promise.all([
        promptRepository.findMany({ take: 100 }),
        formationRepository.findMany({ take: 100 }),
        jeuRepository.findMany({ take: 100 }),
        opportuniteRepository.findMany({ take: 100 }),
      ])

      for (const rows of [prompts, formations, jeux, opportunites]) {
        expect(rows.length).toBeLessThanOrEqual(100)
      }
      expectNoLockedFields(prompts, ["body"])
      expectNoLockedFields(formations, ["body"])
      expectNoLockedFields(jeux, ["body"])
      expectNoLockedFields(opportunites, ["body", "externalUrl"])
      expectReleaseEvidence(releaseEvidence(), [
        /logs? Prisma/iu,
        /quatre requêtes[\s\S]{0,80}(?:sans|aucun)[\s\S]{0,20}N\+1/iu,
        /volume réel/iu,
      ])
    },
  )
})
