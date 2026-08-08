import { readFile } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

function scenario(name: string, given: string, when: string, then: string) {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

describe("divergences explicites du patron de rubrique", () => {
  it(
    scenario(
      "Le patron recense les champs verrouillés et filtres spécifiques",
      "le patron Prompts répliqué vers Formations et Opportunités",
      "docs/patron-rubrique.md est lu après la réplication",
      "il exige de recenser tous les champs verrouillés, cite externalUrl, place péremption et expiration dans le repository et distingue les formations permanentes des événementielles",
    ),
    async () => {
      const document = await readFile(
        path.join(process.cwd(), "docs", "patron-rubrique.md"),
        "utf8",
      )
      expect(document).toMatch(
        /tous les champs verrouillés|champs verrouillés.*recens/i,
      )
      expect(document).toContain("externalUrl")
      expect(document).toMatch(
        /pér[ée]mption[\s\S]*repository|repository[\s\S]*pér[ée]mption/i,
      )
      expect(document).toMatch(/PERMANENTE|permanente/u)
      expect(document).toMatch(/EVENEMENTIELLE|événementielle/u)
    },
  )
})
