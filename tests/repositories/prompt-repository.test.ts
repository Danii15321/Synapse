import { spawnSync } from "node:child_process"

import { describe, expect, it } from "vitest"

import { db } from "@/server/db"

type FindManyRepository = {
  findMany: () => Promise<unknown>
}

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

function isFindManyRepository(value: unknown): value is FindManyRepository {
  return isRecord(value) && typeof value.findMany === "function"
}

async function loadRepository(): Promise<FindManyRepository> {
  const module: unknown =
    await import("@/server/repositories/prompt-repository")

  if (!isFindManyRepository(module)) {
    throw new Error("prompt-repository doit exporter findMany")
  }

  return module
}

async function expectPostgreSql(): Promise<void> {
  const rows = await db.$queryRaw<
    Array<{ version: string }>
  >`SELECT version() AS version`
  expect(rows[0]?.version).toMatch(/PostgreSQL 16/i)
}

async function clearPrompts(): Promise<void> {
  await db.$executeRaw`DELETE FROM "Prompt"`
}

async function insertPrompt(index: number): Promise<void> {
  await db.$executeRaw`
    INSERT INTO "Prompt" ("id", "slug", "title", "summary", "createdAt", "updatedAt")
    VALUES (
      ${`test-prompt-${index}`},
      ${`test-prompt-${index}`},
      ${`Prompt ${index}`},
      ${`Résumé ${index}`},
      NOW(),
      NOW()
    )
  `
}

describe("repository des prompts sur PostgreSQL", () => {
  it(
    scenario(
      "La liste repository ne charge que les champs publics attendus",
      "une vraie base PostgreSQL 16 contenant un prompt avec ses timestamps techniques",
      "la liste des prompts est lue par le repository",
      "chaque row contient exactement id, slug, title et summary, sans timestamps ni champ supplémentaire",
    ),
    async () => {
      const repository = await loadRepository()
      await expectPostgreSql()
      await clearPrompts()
      await insertPrompt(1)

      const rows = await repository.findMany()

      expect(Array.isArray(rows)).toBe(true)
      if (!Array.isArray(rows) || !isRecord(rows[0])) {
        throw new Error("findMany doit retourner un tableau de rows")
      }
      expect(Object.keys(rows[0]).sort()).toEqual([
        "id",
        "slug",
        "summary",
        "title",
      ])
      expect(rows[0]).toEqual({
        id: "test-prompt-1",
        slug: "test-prompt-1",
        summary: "Résumé 1",
        title: "Prompt 1",
      })
    },
  )

  it(
    scenario(
      "La liste repository est réellement bornée par take",
      "une vraie base PostgreSQL 16 contenant 101 prompts",
      "la liste est demandée sans pagination client",
      "le repository retourne au moins un prompt mais strictement moins que les 101 lignes disponibles",
    ),
    async () => {
      const repository = await loadRepository()
      await expectPostgreSql()
      await clearPrompts()
      for (let index = 1; index <= 101; index += 1) {
        await insertPrompt(index)
      }

      const rows = await repository.findMany()

      expect(Array.isArray(rows)).toBe(true)
      if (!Array.isArray(rows)) {
        throw new Error("findMany doit retourner un tableau")
      }
      expect(rows.length).toBeGreaterThan(0)
      expect(rows.length).toBeLessThan(101)
    },
  )

  it(
    scenario(
      "Le seed peut être rejoué sans dupliquer les prompts",
      "une vraie base PostgreSQL 16 vide et la commande Prisma configurée",
      "prisma db seed est exécuté deux fois de suite",
      "les deux exécutions réussissent et la base contient toujours exactement deux prompts aux slugs distincts",
    ),
    async () => {
      await expectPostgreSql()
      await clearPrompts()

      const firstRun = spawnSync("npx", ["prisma", "db", "seed"], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: process.env,
      })
      const secondRun = spawnSync("npx", ["prisma", "db", "seed"], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: process.env,
      })
      const counts = await db.$queryRaw<
        Array<{ prompts: number; slugs: number }>
      >`
        SELECT
          COUNT(*)::int AS prompts,
          COUNT(DISTINCT "slug")::int AS slugs
        FROM "Prompt"
      `

      expect(firstRun.status, `${firstRun.stdout}\n${firstRun.stderr}`).toBe(0)
      expect(secondRun.status, `${secondRun.stdout}\n${secondRun.stderr}`).toBe(
        0,
      )
      expect(counts).toEqual([{ prompts: 2, slugs: 2 }])
    },
    60_000,
  )
})
