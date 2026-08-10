import { spawnSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import { PrismaClient } from "@prisma/client"

export const ROOT = process.cwd()

export const SOURCE_COUNTS = {
  BUSINESS: 30,
  ETUDES: 11,
  MANGA: 3,
  "MARKETING DIGITAL": 4,
  "RESEAUX SOCIAUX": 8,
  "VIE PRO": 13,
} as const

export const EXPECTED_FREE_BY_SOURCE = {
  BUSINESS: 9,
  ETUDES: 3,
  MANGA: 1,
  "MARKETING DIGITAL": 1,
  "RESEAUX SOCIAUX": 2,
  "VIE PRO": 4,
} as const

export type SourceDirectory = keyof typeof SOURCE_COUNTS

export type ResourceProject = Readonly<{
  directory: string
  promptsDirectory: string
}>

export type SeedResult = Readonly<{
  output: string
  status: number | null
}>

export function assertCommandSucceeded(result: SeedResult): void {
  if (result.status !== 0) {
    throw new Error(result.output)
  }
}

export function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

export function syntheticMarkdown(
  title: string,
  body: string,
  target = "Claude, ChatGPT",
): string {
  return [
    `## ${title}`,
    `Modèle Cible : ${target}`,
    "### Prompt :",
    body,
    "",
  ].join("\n")
}

function sourceKey(source: SourceDirectory): string {
  return source
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
}

export async function createResourceProject(
  counts: Readonly<Partial<Record<SourceDirectory, number>>> = SOURCE_COUNTS,
): Promise<ResourceProject> {
  const directory = path.join(
    ROOT,
    "tests",
    `.tmp-resource-import-${randomUUID()}`,
  )
  const promptsDirectory = path.join(directory, "ressources", "PROMPTS")
  await mkdir(promptsDirectory, { recursive: true })

  const packageJson = {
    name: "synapse-resource-import-fixture",
    private: true,
    prisma: {
      seed: `tsx ${path.join(ROOT, "prisma", "seed.ts")}`,
    },
  }
  await writeFile(
    path.join(directory, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
    "utf8",
  )

  for (const source of Object.keys(counts) as SourceDirectory[]) {
    const count = counts[source] ?? 0
    const sourceDirectory = path.join(promptsDirectory, source)
    await mkdir(sourceDirectory, { recursive: true })
    const key = sourceKey(source)
    for (let index = 1; index <= count; index += 1) {
      const padded = String(index).padStart(3, "0")
      const title = `${source} Prompt ${padded}`
      const sentinel = `CORPS-SYNTHETIQUE-${key}-${padded}`
      const body =
        index === 1 && source === "BUSINESS"
          ? `${sentinel}\n<script>window.__synapseImportXss = "EXECUTED"</script>`
          : index === count && source === "VIE PRO"
            ? `${sentinel}\n${Array.from(
                { length: 200 },
                (_, line) => `Ligne longue synthétique ${line + 1}.`,
              ).join("\n")}`
            : `${sentinel}\nInstruction éditoriale synthétique ${padded}.`
      await writeFile(
        path.join(sourceDirectory, `${title}.md`),
        syntheticMarkdown(title, body),
        "utf8",
      )
    }
  }

  return { directory, promptsDirectory }
}

export async function removeResourceProject(
  project: ResourceProject,
): Promise<void> {
  const expectedPrefix = path.join(ROOT, "tests", ".tmp-resource-import-")
  if (!project.directory.startsWith(expectedPrefix)) {
    throw new Error("Refus de supprimer un répertoire hors fixtures de test")
  }
  await rm(project.directory, { force: true, recursive: true })
}

export function isolatedDatabaseUrl(label: string): string {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL est requise pour le test PostgreSQL")
  }
  const parsed = new URL(databaseUrl)
  const safeLabel = label.toLowerCase().replace(/[^a-z0-9_]/gu, "_")
  const schema = `t11_${safeLabel}_${process.pid}`
  if (!/^t11_[a-z0-9_]+$/u.test(schema)) {
    throw new Error("Le schéma de test calculé n'est pas sûr")
  }
  parsed.searchParams.set("schema", schema)
  return parsed.toString()
}

export function resetIsolatedDatabase(databaseUrl: string): SeedResult {
  const result = spawnSync(
    "npx",
    [
      "prisma",
      "db",
      "push",
      "--force-reset",
      "--skip-generate",
      "--schema",
      path.join(ROOT, "prisma", "schema.prisma"),
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: databaseUrl },
    },
  )
  return {
    output: `${result.stdout}\n${result.stderr}`,
    status: result.status,
  }
}

export function runSeed(
  project: ResourceProject,
  databaseUrl: string,
): SeedResult {
  const result = spawnSync(
    "npx",
    [
      "prisma",
      "db",
      "seed",
      "--schema",
      path.join(ROOT, "prisma", "schema.prisma"),
    ],
    {
      cwd: project.directory,
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: databaseUrl },
    },
  )
  return {
    output: `${result.stdout}\n${result.stderr}`,
    status: result.status,
  }
}

export function databaseClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  })
}

export async function insertLegacyDemoContent(db: PrismaClient): Promise<void> {
  await db.prompt.create({
    data: {
      body: "ANCIEN-CORPS-DEMONSTRATION-PROMPT",
      domain: "ia",
      excerpt: "Ancien extrait de démonstration.",
      publishedAt: new Date("2026-01-01T00:00:00.000Z"),
      slug: "ancienne-demo-prompt",
      summary: "Ancien résumé de démonstration.",
      tags: ["demo"],
      title: "Ancien prompt de démonstration",
      visibility: "FREE",
    },
  })
  await db.formation.create({
    data: {
      body: "ANCIEN-CORPS-DEMONSTRATION-FORMATION",
      excerpt: "Ancien extrait de formation.",
      format: "EN_LIGNE",
      kind: "PERMANENTE",
      level: "DEBUTANT",
      publishedAt: new Date("2026-01-01T00:00:00.000Z"),
      slug: "ancienne-demo-formation",
      summary: "Ancien résumé de formation.",
      title: "Ancienne formation de démonstration",
      visibility: "FREE",
    },
  })
  await db.opportunite.create({
    data: {
      body: "ANCIEN-CORPS-DEMONSTRATION-OPPORTUNITE",
      excerpt: "Ancien extrait d'opportunité.",
      organisme: "Organisation de démonstration",
      publishedAt: new Date("2026-01-01T00:00:00.000Z"),
      slug: "ancienne-demo-opportunite",
      summary: "Ancien résumé d'opportunité.",
      title: "Ancienne opportunité de démonstration",
      type: "STAGE",
      visibility: "FREE",
    },
  })
  await db.jeu.create({
    data: {
      body: "ANCIEN-CORPS-DEMONSTRATION-JEU",
      excerpt: "Ancien extrait de jeu.",
      publishedAt: new Date("2026-01-01T00:00:00.000Z"),
      slug: "ancienne-demo-jeu",
      summary: "Ancien résumé de jeu.",
      title: "Ancien jeu de démonstration",
      visibility: "FREE",
    },
  })
}
