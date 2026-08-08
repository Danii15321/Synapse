import { readFileSync } from "node:fs"
import { join } from "node:path"

import type { Prisma } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { db } from "@/server/db"

type HomeOverviewRow = {
  counts: {
    formations: number
    jeux: number
    opportunites: number
    prompts: number
  }
  recentPrompts: unknown[]
}

type HomeRepository = {
  getHomeOverview: () => Promise<HomeOverviewRow>
}

const promptSnapshotSelect = {
  body: true,
  coverImage: true,
  createdAt: true,
  domain: true,
  excerpt: true,
  id: true,
  publishedAt: true,
  slug: true,
  summary: true,
  tags: true,
  title: true,
  updatedAt: true,
  visibility: true,
} satisfies Prisma.PromptSelect

type PromptSnapshot = Prisma.PromptGetPayload<{
  select: typeof promptSnapshotSelect
}>

let initialPrompts: PromptSnapshot[] | undefined

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

function isHomeRepository(value: unknown): value is HomeRepository {
  return isRecord(value) && typeof value.getHomeOverview === "function"
}

async function loadRepository(): Promise<HomeRepository> {
  const modulePath = "@/server/repositories/home-repository"
  const module: unknown = await import(modulePath)
  if (!isHomeRepository(module)) {
    throw new Error("home-repository doit exporter getHomeOverview")
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

async function insertPrompt(
  index: number,
  createdAt: Date,
  visibility: "FREE" | "PREMIUM" = "FREE",
): Promise<void> {
  const coverImage =
    index % 2 === 0 ? `/images/prompts/accueil-${index}.webp` : null
  const domain = index % 2 === 0 ? "communication" : "entrepreneuriat"

  await db.$executeRaw`
    INSERT INTO "Prompt" (
      "id", "slug", "title", "summary", "excerpt", "domain", "tags",
      "coverImage", "visibility", "body", "publishedAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${`home-prompt-${index}`},
      ${`home-prompt-${index}`},
      ${`Prompt accueil ${index}`},
      ${`Résumé accueil ${index}`},
      ${`Extrait accueil ${index}`},
      ${domain}::"PromptDomain",
      ARRAY[${`accueil-${index}`}]::text[],
      ${coverImage},
      ${visibility}::"Visibility",
      ${`Corps accueil ${index}`},
      ${createdAt},
      ${createdAt},
      ${createdAt}
    )
  `
}

beforeEach(async () => {
  initialPrompts = await db.prompt.findMany({
    orderBy: { id: "asc" },
    select: promptSnapshotSelect,
  })
})

afterEach(async () => {
  const snapshot = initialPrompts
  if (!snapshot) return

  await db.$transaction(async (transaction) => {
    await transaction.prompt.deleteMany()
    if (snapshot.length > 0) {
      await transaction.prompt.createMany({ data: snapshot })
    }
  })
  initialPrompts = undefined
})

describe("repository de l'accueil sur PostgreSQL", () => {
  it(
    scenario(
      "Le compteur Prompts reflète exactement la base",
      "une vraie base PostgreSQL 16 contenant quatre prompts et aucune donnée dans les rubriques pas encore modélisées",
      "l'agrégat de l'accueil est lu par le repository",
      "le compteur Prompts vaut 4 et les trois compteurs encore vides valent 0, sans chiffre de démonstration inventé",
    ),
    async () => {
      const repository = await loadRepository()
      await expectPostgreSql()
      await clearPrompts()
      for (let index = 1; index <= 4; index += 1) {
        await insertPrompt(
          index,
          new Date(`2026-08-0${index}T10:00:00.000Z`),
          "PREMIUM",
        )
      }

      const overview = await repository.getHomeOverview()

      expect(overview.counts).toEqual({
        formations: 0,
        jeux: 0,
        opportunites: 0,
        prompts: 4,
      })
    },
  )

  it(
    scenario(
      "La mise en avant charge trois prompts récents sans contenu verrouillé",
      "quatre prompts publiés et datés dans une vraie base, avec domaines, images, tags et visibilités distincts, dont les corps contiennent des sentinelles sensibles",
      "l'agrégat de l'accueil est lu",
      "seuls les trois plus récents reviennent, du plus récent au plus ancien, avec exactement toutes les métadonnées publiques de PromptCard et sans body ni excerpt",
    ),
    async () => {
      const repository = await loadRepository()
      await expectPostgreSql()
      await clearPrompts()
      for (let index = 1; index <= 4; index += 1) {
        await insertPrompt(
          index,
          new Date(`2026-08-0${index}T10:00:00.000Z`),
          index % 2 === 0 ? "FREE" : "PREMIUM",
        )
      }

      const overview = await repository.getHomeOverview()
      const repositorySource = readFileSync(
        join(process.cwd(), "src/server/repositories/home-repository.ts"),
        "utf8",
      )

      expect(overview.recentPrompts).toHaveLength(3)
      expect(overview.recentPrompts).toEqual([
        {
          coverImage: "/images/prompts/accueil-4.webp",
          domain: "communication",
          id: "home-prompt-4",
          slug: "home-prompt-4",
          summary: "Résumé accueil 4",
          tags: ["accueil-4"],
          title: "Prompt accueil 4",
          visibility: "FREE",
        },
        {
          coverImage: null,
          domain: "entrepreneuriat",
          id: "home-prompt-3",
          slug: "home-prompt-3",
          summary: "Résumé accueil 3",
          tags: ["accueil-3"],
          title: "Prompt accueil 3",
          visibility: "PREMIUM",
        },
        {
          coverImage: "/images/prompts/accueil-2.webp",
          domain: "communication",
          id: "home-prompt-2",
          slug: "home-prompt-2",
          summary: "Résumé accueil 2",
          tags: ["accueil-2"],
          title: "Prompt accueil 2",
          visibility: "FREE",
        },
      ])
      expect(JSON.stringify(overview.recentPrompts)).not.toContain(
        "Corps accueil",
      )
      expect(repositorySource).not.toMatch(/\bbody\s*:/)
      expect(repositorySource).not.toMatch(/\bexcerpt\s*:/)
    },
  )
})
