import "server-only"

import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

import { z } from "zod"

import {
  promptImportRowSchema,
  resourceImportInputSchema,
  resourceImportReportSchema,
  type PromptImportRow,
  type ResourceImportInput,
  type ResourceImportReport,
} from "@/lib/validators/resource-import"
import { synchronizePromptCatalog } from "@/server/repositories/resource-import-repository"

/**
 * Spécification : importe exclusivement les fichiers Markdown présents dans
 * les six dossiers de ressources/PROMPTS. Chaque fichier est validé avant la
 * moindre écriture, les slugs et tags sont normalisés, les quotas FREE sont
 * stables par dossier et le corps éditorial n'est jamais réutilisé pour les
 * métadonnées publiques. Une synchronisation remplace ensuite le catalogue de
 * démonstration et rend l'opération rejouable.
 */

const SOURCE_CONFIGURATION = {
  BUSINESS: {
    domain: "entrepreneuriat",
    free: 9,
    label: "l'entrepreneuriat",
  },
  ETUDES: { domain: "productivite", free: 3, label: "les études" },
  MANGA: { domain: "ia", free: 1, label: "la création visuelle" },
  "MARKETING DIGITAL": {
    domain: "communication",
    free: 1,
    label: "le marketing digital",
  },
  "RESEAUX SOCIAUX": {
    domain: "communication",
    free: 2,
    label: "les réseaux sociaux",
  },
  "VIE PRO": {
    domain: "communication",
    free: 4,
    label: "la vie professionnelle",
  },
} as const

type SourceDirectory = keyof typeof SOURCE_CONFIGURATION

const SOURCE_DIRECTORIES = Object.keys(
  SOURCE_CONFIGURATION,
) as SourceDirectory[]
const PUBLICATION_DATE = new Date("2026-08-10T00:00:00.000Z")

type ResourceFile = Readonly<{
  absolutePath: string
  relativePath: string
  source: SourceDirectory
}>

type ResourceImportDependencies = Readonly<{
  synchronizePromptCatalog: typeof synchronizePromptCatalog
}>

const DEFAULT_DEPENDENCIES: ResourceImportDependencies = {
  synchronizePromptCatalog,
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
}

function parseTargets(markdown: string): string[] {
  const targetLine = markdown
    .split(/\r?\n/u)
    .find((line) => /^Mod[eè]le Cible\s*:/iu.test(line.trim()))
  const targets = targetLine?.replace(/^Mod[eè]le Cible\s*:\s*/iu, "") ?? ""
  return targets.split(",").map(normalize).filter(Boolean)
}

function parseMarkdown(
  markdown: string,
): Readonly<{ body: string; targets: string[]; title: string }> {
  const lines = markdown.replace(/^\uFEFF/u, "").split(/\r?\n/u)
  const title =
    lines
      .map((line) => /^##\s+(.+?)\s*$/u.exec(line)?.[1]?.trim())
      .find((candidate) => candidate !== undefined) ?? ""
  const promptMarker = lines.findIndex((line) =>
    /^###\s+Prompt\s*:\s*$/iu.test(line.trim()),
  )
  const body = promptMarker < 0 ? "" : lines.slice(promptMarker + 1).join("\n")

  return { body: body.trim(), targets: parseTargets(markdown), title }
}

async function listResourceFiles(directory: string): Promise<ResourceFile[]> {
  const rootEntries = await readdir(directory, { withFileTypes: true })
  const availableDirectories = new Map(
    rootEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => [entry.name, entry]),
  )
  const files: ResourceFile[] = []

  for (const source of SOURCE_DIRECTORIES) {
    if (!availableDirectories.has(source)) continue
    const sourceDirectory = path.join(directory, source)
    const sourceEntries = await readdir(sourceDirectory, {
      withFileTypes: true,
    })
    const markdownFiles = sourceEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .sort((left, right) => left.name.localeCompare(right.name, "fr"))

    for (const entry of markdownFiles) {
      files.push({
        absolutePath: path.join(sourceDirectory, entry.name),
        relativePath: path.join(source, entry.name),
        source,
      })
    }
  }

  return files
}

function validationError(file: string, error: z.ZodError): Error {
  const reasons = error.issues
    .map((issue) => `${issue.path.join(".") || "resource"}: ${issue.message}`)
    .join("; ")
  return new Error(`Rejeté — ${file} — motif: ${reasons}`)
}

function publicMetadata(
  title: string,
  source: SourceDirectory,
): Readonly<{ excerpt: string; summary: string }> {
  const label = SOURCE_CONFIGURATION[source].label
  return {
    excerpt: `Découvrez la méthode et les objectifs de « ${title} » avant d'accéder au prompt complet.`,
    summary: `Un prompt structuré pour progresser dans ${label} : ${title}.`,
  }
}

async function prepareRows(
  files: ResourceFile[],
): Promise<Readonly<{ free: number; rows: PromptImportRow[] }>> {
  let free = 0
  const rows: PromptImportRow[] = []
  const slugSources = new Map<string, string>()
  const usedFreeSlots = new Map<SourceDirectory, number>()

  for (const file of files) {
    const markdown = await readFile(file.absolutePath, "utf8")
    const parsedMarkdown = parseMarkdown(markdown)
    const slug = normalize(parsedMarkdown.title)
    const previousFile = slugSources.get(slug)
    if (previousFile) {
      throw new Error(
        `Rejeté — champ slug en collision entre ${previousFile} et ${file.relativePath}`,
      )
    }

    const currentFreeSlots = usedFreeSlots.get(file.source) ?? 0
    const isFree = currentFreeSlots < SOURCE_CONFIGURATION[file.source].free
    const metadata = publicMetadata(parsedMarkdown.title, file.source)
    const candidate = {
      body: parsedMarkdown.body,
      coverImage: null,
      domain: SOURCE_CONFIGURATION[file.source].domain,
      excerpt: metadata.excerpt,
      publishedAt: new Date(PUBLICATION_DATE),
      slug,
      summary: metadata.summary,
      tags: [normalize(file.source), ...parsedMarkdown.targets],
      title: parsedMarkdown.title,
      visibility: isFree ? "FREE" : "PREMIUM",
    }
    const validated = promptImportRowSchema.safeParse(candidate)
    if (!validated.success) {
      throw validationError(file.relativePath, validated.error)
    }

    slugSources.set(validated.data.slug, file.relativePath)
    if (isFree) {
      free += 1
      usedFreeSlots.set(file.source, currentFreeSlots + 1)
    }
    rows.push(validated.data)
  }

  return { free, rows }
}

export async function importPromptResources(
  input: ResourceImportInput,
  dependencies: ResourceImportDependencies = DEFAULT_DEPENDENCIES,
): Promise<ResourceImportReport> {
  const validatedInput = resourceImportInputSchema.parse(input)
  const files = await listResourceFiles(validatedInput.directory)
  const prepared = await prepareRows(files)
  const synchronization = await dependencies.synchronizePromptCatalog(
    prepared.rows,
  )

  return resourceImportReportSchema.parse({
    distribution: {
      formations: { FREE: 0, PREMIUM: 0 },
      jeux: { FREE: 0, PREMIUM: 0 },
      opportunites: { FREE: 0, PREMIUM: 0 },
      prompts: {
        FREE: prepared.free,
        PREMIUM: prepared.rows.length - prepared.free,
      },
    },
    imported: synchronization.imported,
    rejected: 0,
    updated: synchronization.updated,
  })
}
