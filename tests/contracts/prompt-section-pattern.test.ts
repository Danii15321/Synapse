import { readFile } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

describe("patron de réplication d'une rubrique", () => {
  it(
    scenario(
      "Le patron de rubrique documente l'ordre complet des couches et les preuves attendues",
      "le livrable docs/patron-rubrique.md hors pipeline en lecture seule",
      "le document est lu comme guide de création d'une nouvelle rubrique",
      "validators précède repository, service, Route Handler, lib/api, hook, composants et pages, puis le guide rappelle les quatre états, les quatre niveaux de test et le gating serveur",
    ),
    async () => {
      const document = await readFile(
        path.join(process.cwd(), "docs", "patron-rubrique.md"),
        "utf8",
      )
      const orderedTerms = [
        /validator/i,
        /repositor/i,
        /service/i,
        /route handler|app\/api/i,
        /lib\/api/i,
        /hook/i,
        /composant/i,
        /page/i,
      ]
      let cursor = -1
      for (const term of orderedTerms) {
        const next = document.slice(cursor + 1).search(term)
        expect(
          next,
          `terme manquant ou hors ordre: ${term}`,
        ).toBeGreaterThanOrEqual(0)
        cursor += next + 1
      }
      for (const state of ["loading", "error", "empty", "success"]) {
        expect(document).toMatch(new RegExp(`\\b${state}\\b`, "i"))
      }
      for (const level of ["repository", "service", "API", "E2E"]) {
        expect(document).toMatch(new RegExp(`\\b${level}\\b`, "i"))
      }
      expect(document).toMatch(/select[\s\S]*body|body[\s\S]*select/i)
      expect(document).toMatch(/anonyme/i)
      expect(document).toMatch(/FREE/)
      expect(document).toMatch(/JSON brut/i)
    },
  )
})
