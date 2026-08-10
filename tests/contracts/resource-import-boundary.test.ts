import { spawnSync } from "node:child_process"
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { ROOT, scenario } from "../fixtures/resource-import-test-utils"

async function markdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(entryPath)
    }
    if (
      entry.isDirectory() &&
      entry.name !== "journal" &&
      entry.name !== "pipeline-dev"
    ) {
      files.push(...(await markdownFiles(entryPath)))
    }
  }
  return files
}

describe("frontière non versionnée des ressources éditoriales", () => {
  it(
    scenario(
      "Le dossier ressources entier reste hors de l'historique Git",
      "un dépôt susceptible de devenir public et contenant du contenu premium local",
      "la liste des fichiers suivis et les règles d'ignore sont interrogées",
      "aucun chemin sous ressources n'est versionné et un fichier arbitraire sous ressources/PROMPTS est ignoré même s'il n'existe pas",
    ),
    () => {
      const tracked = spawnSync("git", ["ls-files", "-z", "ressources"], {
        cwd: ROOT,
        encoding: "utf8",
      })
      const ignored = spawnSync(
        "git",
        [
          "check-ignore",
          "--no-index",
          "ressources/PROMPTS/BUSINESS/contenu-premium-local.md",
        ],
        { cwd: ROOT, encoding: "utf8" },
      )

      expect(tracked.status, tracked.stderr).toBe(0)
      expect(tracked.stdout).toBe("")
      expect(ignored.status, ignored.stderr).toBe(0)
      expect(ignored.stdout).toContain("ressources/PROMPTS")
    },
  )

  it(
    scenario(
      "Une procédure autonome documente l'approvisionnement et le réimport",
      "un clone frais dans lequel ressources est volontairement absent",
      "la documentation hors pipeline est lue sans connaissance implicite de la machine du développeur",
      "un document nomme la source exacte ressources/PROMPTS, explique comment l'approvisionner sans Git, lancer npx prisma db seed et interpréter importés, mis à jour, rejetés et FREE/PREMIUM",
    ),
    async () => {
      const candidates = await markdownFiles(path.join(ROOT, "docs"))
      const documents = await Promise.all(
        candidates.map(async (file) => ({
          content: await readFile(file, "utf8"),
          file,
        })),
      )
      const procedure = documents.find(
        ({ content }) =>
          /ressources\/PROMPTS/u.test(content) &&
          /npx prisma db seed/u.test(content) &&
          /approvision|copier|fournir|récupér/iu.test(content),
      )

      expect(
        procedure?.file,
        "une procédure d'import hors docs/pipeline-dev est requise",
      ).toBeTruthy()
      expect(procedure?.content).toMatch(/import(?:é|e|ed)/iu)
      expect(procedure?.content).toMatch(/mis(?:e)?s? à jour|updated/iu)
      expect(procedure?.content).toMatch(/rejet|reject/iu)
      expect(procedure?.content).toMatch(/FREE/iu)
      expect(procedure?.content).toMatch(/PREMIUM/iu)
      expect(procedure?.content).toMatch(/hors Git|non versionn|ignor/iu)
    },
  )
})
