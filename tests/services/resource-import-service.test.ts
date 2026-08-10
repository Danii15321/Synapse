import { writeFile } from "node:fs/promises"
import path from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import {
  createResourceProject,
  EXPECTED_FREE_BY_SOURCE,
  removeResourceProject,
  scenario,
  SOURCE_COUNTS,
  syntheticMarkdown,
  type ResourceProject,
  type SourceDirectory,
} from "../fixtures/resource-import-test-utils"

type ImportReport = Readonly<{
  distribution: Readonly<
    Record<
      "formations" | "jeux" | "opportunites" | "prompts",
      Readonly<{ FREE: number; PREMIUM: number }>
    >
  >
  imported: number
  rejected: number
  updated: number
}>

type ResourceImportService = Readonly<{
  importPromptResources: (
    input: Readonly<{ directory: string }>,
  ) => Promise<ImportReport>
}>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isResourceImportService(
  value: unknown,
): value is ResourceImportService {
  return isRecord(value) && typeof value.importPromptResources === "function"
}

async function loadService(): Promise<ResourceImportService> {
  const modulePath = "@/server/services/resource-import-service"
  const module: unknown = await import(modulePath)
  if (!isResourceImportService(module)) {
    throw new Error(
      "resource-import-service doit exporter importPromptResources",
    )
  }
  return module
}

function importedRows(call: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(call) || !call.every(isRecord)) {
    throw new Error(
      "synchronizePromptCatalog doit recevoir la liste des prompts validés",
    )
  }
  return call
}

function sourceFromBody(body: unknown): SourceDirectory {
  const normalized = String(body).toLowerCase()
  const match = (Object.keys(SOURCE_COUNTS) as SourceDirectory[]).find(
    (source) => {
      const key = source.toLowerCase().replaceAll(" ", "-")
      return normalized.includes(`corps-synthetique-${key}-`)
    },
  )
  if (!match) {
    throw new Error(`source synthétique introuvable dans ${String(body)}`)
  }
  return match
}

describe("service d'import des ressources éditoriales", () => {
  const projects: ResourceProject[] = []

  afterEach(async () => {
    vi.doUnmock("@/server/repositories/resource-import-repository")
    vi.resetModules()
    await Promise.all(projects.splice(0).map(removeResourceProject))
  })

  it(
    scenario(
      "Les 69 fichiers bruts sont transformés en prompts complets sans perdre leur corps",
      "69 fichiers Markdown synthétiques répartis comme les six dossiers réels de ressources/PROMPTS, sans frontmatter ni image",
      "le service prépare l'import et remet le catalogue au repository",
      "69 rows validées portent slug normalisé, tags minuscules, date ISO, visibilité explicite, domaine fermé et coverImage null pour le fallback UI, tandis que body conserve sa sentinelle et summary/excerpt ne la recopient pas",
    ),
    async () => {
      const project = await createResourceProject()
      projects.push(project)
      const synchronizePromptCatalog = vi.fn().mockResolvedValue({
        imported: 69,
        updated: 0,
      })
      vi.doMock("@/server/repositories/resource-import-repository", () => ({
        synchronizePromptCatalog,
      }))
      const service = await loadService()

      await service.importPromptResources({
        directory: project.promptsDirectory,
      })

      expect(synchronizePromptCatalog).toHaveBeenCalledTimes(1)
      const rows = importedRows(synchronizePromptCatalog.mock.calls[0]?.[0])
      expect(rows).toHaveLength(69)
      const allowedDomains = new Set([
        "communication",
        "entrepreneuriat",
        "ia",
        "productivite",
      ])
      const domainsBySource = new Map<SourceDirectory, Set<unknown>>()
      for (const row of rows) {
        const body = String(row.body)
        const sentinel = /CORPS-SYNTHETIQUE-[a-z-]+-\d{3}/u.exec(body)?.[0]
        expect(sentinel).toBeTruthy()
        expect(String(row.summary)).not.toContain(sentinel)
        expect(String(row.excerpt)).not.toContain(sentinel)
        expect(row.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
        expect(allowedDomains.has(String(row.domain))).toBe(true)
        expect(["FREE", "PREMIUM"]).toContain(row.visibility)
        expect(row.visibility).not.toBeUndefined()
        expect(row.coverImage).toBeNull()
        expect(row.publishedAt).toBeInstanceOf(Date)
        expect(new Date(String(row.publishedAt)).toISOString()).toMatch(
          /^\d{4}-\d{2}-\d{2}T/u,
        )
        if (!Array.isArray(row.tags)) {
          throw new Error("les tags importés doivent former un tableau")
        }
        for (const tag of row.tags) {
          expect(tag).toBe(String(tag).trim().toLowerCase())
          expect(String(tag).normalize("NFD")).not.toMatch(/[\u0300-\u036f]/u)
        }
        const source = sourceFromBody(row.body)
        const domains = domainsBySource.get(source) ?? new Set<unknown>()
        domains.add(row.domain)
        domainsBySource.set(source, domains)
      }
      expect(domainsBySource.size).toBe(6)
      for (const domains of domainsBySource.values()) {
        expect(domains.size).toBe(1)
      }
    },
  )

  it(
    scenario(
      "Aucune visibility n'est omise et la répartition 20 FREE/49 PREMIUM est rapportée",
      "les six dossiers synthétiques reprennent les volumes 30, 11, 3, 4, 8 et 13 des 69 prompts réels",
      "le service attribue une visibilité puis termine l'import",
      "chaque dossier possède au moins un prompt FREE, les quotas sont 9/3/1/1/2/4, et le rapport expose Prompts 20/49 plus 0/0 pour les trois rubriques vides",
    ),
    async () => {
      const project = await createResourceProject()
      projects.push(project)
      const synchronizePromptCatalog = vi.fn().mockResolvedValue({
        imported: 69,
        updated: 0,
      })
      vi.doMock("@/server/repositories/resource-import-repository", () => ({
        synchronizePromptCatalog,
      }))
      const service = await loadService()

      const report = await service.importPromptResources({
        directory: project.promptsDirectory,
      })

      const rows = importedRows(synchronizePromptCatalog.mock.calls[0]?.[0])
      const freeBySource = new Map<SourceDirectory, number>()
      for (const row of rows) {
        if (row.visibility === "FREE") {
          const source = sourceFromBody(row.body)
          freeBySource.set(source, (freeBySource.get(source) ?? 0) + 1)
        }
      }
      expect(Object.fromEntries(freeBySource)).toEqual(EXPECTED_FREE_BY_SOURCE)
      expect(report).toMatchObject({
        distribution: {
          formations: { FREE: 0, PREMIUM: 0 },
          jeux: { FREE: 0, PREMIUM: 0 },
          opportunites: { FREE: 0, PREMIUM: 0 },
          prompts: { FREE: 20, PREMIUM: 49 },
        },
        imported: 69,
        rejected: 0,
        updated: 0,
      })
    },
  )

  it(
    scenario(
      "Un fichier invalide arrête l'import en nommant le fichier et le champ fautif",
      "un fichier BUSINESS dont le titre est absent mais dont le corps synthétique est présent",
      "le service valide chaque fichier avant toute écriture",
      "la promesse est rejetée avec BUSINESS/Sans titre.md et le champ title, et le repository n'est jamais appelé",
    ),
    async () => {
      const project = await createResourceProject({ BUSINESS: 0 })
      projects.push(project)
      const invalidFile = path.join(
        project.promptsDirectory,
        "BUSINESS",
        "Sans titre.md",
      )
      await writeFile(invalidFile, "### Prompt :\nCorps sans titre.\n", "utf8")
      const synchronizePromptCatalog = vi.fn()
      vi.doMock("@/server/repositories/resource-import-repository", () => ({
        synchronizePromptCatalog,
      }))
      const service = await loadService()

      const attempt = service.importPromptResources({
        directory: project.promptsDirectory,
      })

      await expect(attempt).rejects.toThrow(/BUSINESS[\\/]Sans titre\.md/iu)
      await expect(attempt).rejects.toThrow(/title/iu)
      expect(synchronizePromptCatalog).not.toHaveBeenCalled()
    },
  )

  it(
    scenario(
      "Deux noms qui produisent le même slug sont refusés bruyamment",
      "deux fichiers BUSINESS intitulés Élan Étude et Elan Etude",
      "le service normalise les accents et espaces puis vérifie l'unicité",
      "l'import échoue en citant les deux fichiers et le champ slug au lieu de créer un doublon invisible",
    ),
    async () => {
      const project = await createResourceProject({ BUSINESS: 0 })
      projects.push(project)
      const directory = path.join(project.promptsDirectory, "BUSINESS")
      await writeFile(
        path.join(directory, "Élan Étude.md"),
        syntheticMarkdown("Élan Étude", "CORPS-SYNTHETIQUE-collision-001"),
        "utf8",
      )
      await writeFile(
        path.join(directory, "Elan Etude.md"),
        syntheticMarkdown("Elan Etude", "CORPS-SYNTHETIQUE-collision-002"),
        "utf8",
      )
      const synchronizePromptCatalog = vi.fn()
      vi.doMock("@/server/repositories/resource-import-repository", () => ({
        synchronizePromptCatalog,
      }))
      const service = await loadService()

      const attempt = service.importPromptResources({
        directory: project.promptsDirectory,
      })

      await expect(attempt).rejects.toThrow(/Élan Étude\.md/iu)
      await expect(attempt).rejects.toThrow(/Elan Etude\.md/iu)
      await expect(attempt).rejects.toThrow(/slug/iu)
      expect(synchronizePromptCatalog).not.toHaveBeenCalled()
    },
  )
})
