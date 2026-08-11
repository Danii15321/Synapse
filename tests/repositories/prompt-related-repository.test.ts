import { afterEach, describe, expect, it } from "vitest"

import type { PromptDomain } from "@/lib/validators/prompt"
import { db } from "@/server/db"

import {
  cleanupPromptFixtures,
  isRecord,
  newPrefix,
  scenario,
} from "./prompt-catalog-fixtures"

type RelatedRepository = Readonly<{
  findRelatedByDomain: (
    options: Readonly<{
      domain: PromptDomain
      excludeId: string
      take: number
    }>,
  ) => Promise<unknown>
}>

function isRelatedRepository(value: unknown): value is RelatedRepository {
  return isRecord(value) && typeof value.findRelatedByDomain === "function"
}

async function loadRelatedRepository(): Promise<RelatedRepository> {
  const module: unknown =
    await import("@/server/repositories/prompt-repository")
  if (!isRelatedRepository(module)) {
    throw new Error(
      "prompt-repository doit exporter findRelatedByDomain avec le contrat arbitré",
    )
  }
  return module
}

afterEach(cleanupPromptFixtures)

describe("suggestions Prompts sur PostgreSQL réel", () => {
  it(
    scenario(
      "Les suggestions sont les trois cartes publiées les plus récentes du même domaine",
      "un prompt courant, quatre autres prompts IA publiés, un brouillon IA et un prompt Communication avec des corps sentinelles",
      "findRelatedByDomain est appelé avec le domaine IA, l'id courant et take 3",
      "les trois plus récents reviennent dans l'ordre publishedAt/id, sans courant, brouillon, autre domaine, body ni excerpt",
    ),
    async () => {
      const prefix = newPrefix("related")
      const currentId = `${prefix}-current`
      const rows = [
        {
          domain: "ia",
          id: currentId,
          publishedAt: new Date("2026-08-01T10:00:00.000Z"),
          title: "Prompt courant",
        },
        {
          domain: "ia",
          id: `${prefix}-related-1`,
          publishedAt: new Date("2026-08-05T10:00:00.000Z"),
          title: "Suggestion 1",
        },
        {
          domain: "ia",
          id: `${prefix}-related-2-z`,
          publishedAt: new Date("2026-08-04T10:00:00.000Z"),
          title: "Suggestion 2 Z",
        },
        {
          domain: "ia",
          id: `${prefix}-related-2-a`,
          publishedAt: new Date("2026-08-04T10:00:00.000Z"),
          title: "Suggestion 2 A",
        },
        {
          domain: "ia",
          id: `${prefix}-related-4`,
          publishedAt: new Date("2026-08-03T10:00:00.000Z"),
          title: "Suggestion hors limite",
        },
        {
          domain: "ia",
          id: `${prefix}-draft`,
          publishedAt: null,
          title: "Brouillon interdit",
        },
        {
          domain: "communication",
          id: `${prefix}-other-domain`,
          publishedAt: new Date("2026-08-06T10:00:00.000Z"),
          title: "Autre domaine interdit",
        },
      ] as const
      await db.prompt.createMany({
        data: rows.map((row) => ({
          body: `BODY-SECRET-${row.id}`,
          coverImage: null,
          domain: row.domain,
          excerpt: `EXCERPT-SECRET-${row.id}`,
          id: row.id,
          publishedAt: row.publishedAt,
          slug: `${row.id}-slug`,
          summary: `Résumé ${row.title}`,
          tags: [prefix],
          title: row.title,
          visibility: row.id.includes("related-2") ? "PREMIUM" : "FREE",
        })),
      })
      const repository = await loadRelatedRepository()

      const result = await repository.findRelatedByDomain({
        domain: "ia",
        excludeId: currentId,
        take: 3,
      })

      expect(Array.isArray(result)).toBe(true)
      if (!Array.isArray(result) || !result.every(isRecord)) {
        throw new Error("findRelatedByDomain doit retourner des rows de carte")
      }
      expect(result.map((row) => row.id)).toEqual([
        `${prefix}-related-1`,
        `${prefix}-related-2-z`,
        `${prefix}-related-2-a`,
      ])
      for (const row of result) {
        expect(Object.keys(row).sort()).toEqual(
          [
            "coverImage",
            "domain",
            "id",
            "slug",
            "summary",
            "tags",
            "title",
            "visibility",
          ].sort(),
        )
        expect(row).not.toHaveProperty("body")
        expect(row).not.toHaveProperty("excerpt")
      }
    },
  )
})
